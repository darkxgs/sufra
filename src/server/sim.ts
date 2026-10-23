import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Connection } from "@/db";
import * as s from "@/db/schema";
import { SIM_NOTES } from "@/db/seed-data";
import { newId } from "@/lib/id";
import { chosen, defaultSelection, problems, unitPrice } from "@/lib/selection";
import type { MenuItem } from "@/lib/types";
import { openSession } from "./guest";
import { loadMenu } from "./menu";
import { bump, rowsOf } from "./tickets";

// "Busy night" for demos: while someone is watching the kitchen board, other
// tables keep ordering. There's no background worker; each poll of the board
// asks whether the next order is due, and one atomic UPDATE decides who makes it.

const VISITOR_TABLE = "4";
const MAX_LIVE = 9;

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export async function maybeSimulate(conn: Connection, rid: string): Promise<boolean> {
  const claimed = rowsOf<{ id: string }>(
    await conn.db.execute(sql`
      UPDATE sufra.restaurants SET sim_next_at = now() + make_interval(secs => 35 + floor(random() * 50)::int)
      WHERE id = ${rid} AND sim_enabled AND (sim_next_at IS NULL OR sim_next_at <= now())
      RETURNING id`),
  );
  if (!claimed.length) return false;

  const [{ live }] = rowsOf<{ live: number }>(
    await conn.db.execute(sql`SELECT count(*)::int AS live FROM sufra.orders WHERE restaurant_id = ${rid} AND status IN ('new', 'preparing', 'ready')`),
  );
  if (live >= MAX_LIVE) return false;

  const menu = await loadMenu(rid);
  if (!menu) return false;
  const items = menu.categories.flatMap((c) => c.items).filter((i) => i.available);
  const tables = await conn.db.select().from(s.tables).where(eq(s.tables.restaurantId, rid));
  const choices = tables.filter((t) => t.label !== VISITOR_TABLE);
  if (!items.length || !choices.length) return false;
  const table = pick(choices);

  // A table that has eaten asks for the bill, so there's always a table to clear.
  if (Math.random() < 0.35) {
    const done = rowsOf<{ session_id: string; table_id: string }>(
      await conn.db.execute(sql`
        SELECT se.id AS session_id, se.table_id FROM sufra.sessions se
        WHERE se.restaurant_id = ${rid} AND se.closed_at IS NULL
          AND EXISTS (SELECT 1 FROM sufra.orders o WHERE o.session_id = se.id)
          AND NOT EXISTS (SELECT 1 FROM sufra.orders o WHERE o.session_id = se.id AND (o.status <> 'served' OR o.served_at > now() - interval '3 minutes'))
          AND NOT EXISTS (SELECT 1 FROM sufra.requests q WHERE q.session_id = se.id AND q.kind = 'bill' AND q.acknowledged_at IS NULL)
          AND se.table_id NOT IN (SELECT id FROM sufra.tables WHERE restaurant_id = ${rid} AND label = ${VISITOR_TABLE})
        LIMIT 1`),
    );
    if (done.length) {
      await conn.db.transaction(async (tx) => {
        await tx.execute(sql`
          INSERT INTO sufra.requests (id, restaurant_id, session_id, table_id, kind, payment)
          VALUES (${newId("req")}, ${rid}, ${done[0].session_id}, ${done[0].table_id}, 'bill', ${Math.random() < 0.7 ? "card" : "cash"})
          ON CONFLICT (session_id, kind) WHERE acknowledged_at IS NULL DO NOTHING`);
        await bump(tx, rid);
      });
      return true;
    }
  }

  // Now and then a table wants a waiter instead of food.
  if (Math.random() < 0.15) {
    await conn.db.transaction(async (tx) => {
      const sessionId = await openSession(tx, rid, table.id);
      await tx.execute(sql`
        INSERT INTO sufra.requests (id, restaurant_id, session_id, table_id, kind)
        VALUES (${newId("req")}, ${rid}, ${sessionId}, ${table.id}, 'waiter')
        ON CONFLICT (session_id, kind) WHERE acknowledged_at IS NULL DO NOTHING`);
      await bump(tx, rid);
    });
    return true;
  }

  const count = 1 + Math.floor(Math.random() * 3);
  const chosenItems = new Map<string, MenuItem>();
  while (chosenItems.size < count) {
    const i = pick(items);
    chosenItems.set(i.id, i);
  }
  const lines = [...chosenItems.values()].map((item, idx) => {
    let ids = defaultSelection(item);
    // Groups without defaults (two sides with the mixed grill): take the first options that satisfy them.
    for (const g of item.groups) {
      const have = g.options.filter((o) => ids.includes(o.id)).length;
      if (have < g.min) ids = [...ids, ...g.options.filter((o) => !ids.includes(o.id)).slice(0, g.min - have).map((o) => o.id)];
    }
    if (problems(item, ids).length) ids = [];
    const note = pick(SIM_NOTES);
    return {
      id: newId("oli"),
      itemId: item.id,
      stationKey: item.stationKey,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      qty: item.stationKey === "bar" && Math.random() < 0.5 ? 2 : 1,
      unitPrice: unitPrice(item, ids),
      options: chosen(item, ids),
      note: note || null,
      sort: idx,
    };
  });

  await conn.db.transaction(async (tx) => {
    const sessionId = await openSession(tx, rid, table.id);
    const [{ round }] = rowsOf<{ round: number }>(await tx.execute(sql`SELECT coalesce(max(round), 0)::int + 1 AS round FROM sufra.orders WHERE session_id = ${sessionId}`));
    const [{ seq }] = rowsOf<{ seq: number }>(
      await tx.execute(sql`
        UPDATE sufra.restaurants SET
          order_seq = CASE WHEN order_day = to_char(now() AT TIME ZONE timezone, 'YYYY-MM-DD') THEN order_seq + 1 ELSE 1 END,
          order_day = to_char(now() AT TIME ZONE timezone, 'YYYY-MM-DD'),
          version = version + 1
        WHERE id = ${rid}
        RETURNING order_seq AS seq`),
    );
    const orderId = newId("ord");
    await tx.insert(s.orders).values({
      id: orderId,
      restaurantId: rid,
      sessionId,
      tableId: table.id,
      number: seq,
      round,
      status: "new",
      idemKey: newId("sim"),
      subtotal: lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
      source: "sim",
    });
    await tx.insert(s.orderItems).values(lines.map((l) => ({ ...l, orderId })));
  });
  return true;
}
