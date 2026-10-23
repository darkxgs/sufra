import "server-only";
import { and, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import type { Connection } from "@/db";
import * as s from "@/db/schema";
import type { Tx } from "@/db/seed";
import { newId } from "@/lib/id";
import { chosen, knownOptions, problems, unitPrice } from "@/lib/selection";
import type { GuestSnapshot, MenuItem, Payment, RequestKind } from "@/lib/types";
import { loadMenu } from "./menu";
import { bump, loadRequests, loadTickets, rowsOf, unavailableItems, versionOf } from "./tickets";

export const LIMITS = { lines: 30, qty: 20, note: 140, ordersPer10Min: 6 };

/** A table's open bill as the guests at it see it. */
export async function guestSnapshot(conn: Connection, table: s.Table): Promise<GuestSnapshot> {
  const { db } = conn;
  const rid = table.restaurantId;
  const [v, unavailable, [session]] = await Promise.all([
    versionOf(db, rid),
    unavailableItems(db, rid),
    db.select().from(s.sessions).where(and(eq(s.sessions.tableId, table.id), isNull(s.sessions.closedAt))),
  ]);
  const now = new Date();
  if (!session) return { v, now: now.toISOString(), session: null, unavailable };
  const labels = new Map([[table.id, table.label]]);
  const recent = new Date(now.getTime() - 10 * 60_000);
  const [orders, requests] = await Promise.all([
    loadTickets(db, and(eq(s.orders.sessionId, session.id), ne(s.orders.status, "cancelled"))!, labels),
    loadRequests(db, and(eq(s.requests.sessionId, session.id), or(isNull(s.requests.acknowledgedAt), gt(s.requests.acknowledgedAt, recent)))!, labels),
  ]);
  return { v, now: now.toISOString(), session: { id: session.id, openedAt: session.openedAt.toISOString(), orders, requests }, unavailable };
}

export type OrderInput = { token: string; idemKey: string; lines: { itemId: string; qty: number; optionIds: string[]; note?: string }[] };
export type PlaceResult =
  | { ok: true; orderId: string; sessionId: string; number: number; round: number; duplicate: boolean }
  | { ok: false; error: "table" | "empty" | "invalid" | "unavailable" | "too_many"; itemIds?: string[] };

/**
 * Sends a round to the kitchen. Prices, options and availability are checked
 * against the database, never taken from the phone. The phone sends a key with
 * every attempt, so a retry after a dropped connection can't order twice.
 */
export async function placeOrder(conn: Connection, table: s.Table, input: OrderInput): Promise<PlaceResult> {
  if (!input.lines.length) return { ok: false, error: "empty" };
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(input.idemKey) || input.lines.length > LIMITS.lines) return { ok: false, error: "invalid" };

  const menu = await loadMenu(table.restaurantId);
  if (!menu) return { ok: false, error: "table" };
  const items = new Map<string, MenuItem>(menu.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const)));

  const unavailable: string[] = [];
  const lines: (typeof s.orderItems.$inferInsert)[] = [];
  for (const [i, l] of input.lines.entries()) {
    const item = items.get(l.itemId);
    if (!item) return { ok: false, error: "invalid" };
    if (!item.available) {
      unavailable.push(item.id);
      continue;
    }
    const qty = Math.trunc(l.qty);
    const note = (l.note ?? "").trim().slice(0, LIMITS.note);
    if (!(qty >= 1 && qty <= LIMITS.qty) || !knownOptions(item, l.optionIds) || problems(item, l.optionIds).length) return { ok: false, error: "invalid" };
    lines.push({
      id: newId("oli"),
      orderId: "",
      itemId: item.id,
      stationKey: item.stationKey,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      qty,
      unitPrice: unitPrice(item, l.optionIds),
      options: chosen(item, l.optionIds),
      note: note || null,
      sort: i,
    });
  }
  if (unavailable.length) return { ok: false, error: "unavailable", itemIds: [...new Set(unavailable)] };
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const rid = table.restaurantId;

  return conn.db.transaction(async (tx) => {
    const [existing] = await tx.select().from(s.orders).where(and(eq(s.orders.restaurantId, rid), eq(s.orders.idemKey, input.idemKey)));
    if (existing) return { ok: true, orderId: existing.id, sessionId: existing.sessionId, number: existing.number, round: existing.round, duplicate: true } as const;

    const sessionId = await openSession(tx, rid, table.id);
    const [{ recent }] = rowsOf<{ recent: number }>(
      await tx.execute(sql`SELECT count(*)::int AS recent FROM sufra.orders WHERE session_id = ${sessionId} AND created_at > now() - interval '10 minutes'`),
    );
    if (recent >= LIMITS.ordersPer10Min) return { ok: false, error: "too_many" } as const;

    const [{ round }] = rowsOf<{ round: number }>(await tx.execute(sql`SELECT coalesce(max(round), 0)::int + 1 AS round FROM sufra.orders WHERE session_id = ${sessionId}`));
    // The day's running order number, reset at midnight in the restaurant's time zone.
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
    await tx.insert(s.orders).values({ id: orderId, restaurantId: rid, sessionId, tableId: table.id, number: seq, round, status: "new", idemKey: input.idemKey, subtotal, source: "guest" });
    await tx.insert(s.orderItems).values(lines.map((l) => ({ ...l, orderId })));
    return { ok: true, orderId, sessionId, number: seq, round, duplicate: false } as const;
  });
}

/** The table's open session, opening one if the table is free. Safe when two phones order at once. */
export async function openSession(tx: Tx, rid: string, tableId: string): Promise<string> {
  const id = newId("ses");
  await tx.execute(sql`INSERT INTO sufra.sessions (id, restaurant_id, table_id) VALUES (${id}, ${rid}, ${tableId}) ON CONFLICT (table_id) WHERE closed_at IS NULL DO NOTHING`);
  const [row] = await tx.select({ id: s.sessions.id }).from(s.sessions).where(and(eq(s.sessions.tableId, tableId), isNull(s.sessions.closedAt)));
  return row.id;
}

export type RequestResult = { ok: true; sessionId: string } | { ok: false; error: "no_order" };

/** "Call a waiter" or "bring the bill". Asking again only updates the payment choice. */
export async function requestService(conn: Connection, table: s.Table, kind: RequestKind, payment: Payment | null): Promise<RequestResult> {
  const rid = table.restaurantId;
  return conn.db.transaction(async (tx) => {
    let sessionId: string;
    if (kind === "bill") {
      const [open] = await tx.select({ id: s.sessions.id }).from(s.sessions).where(and(eq(s.sessions.tableId, table.id), isNull(s.sessions.closedAt)));
      if (!open) return { ok: false, error: "no_order" } as const;
      sessionId = open.id;
    } else {
      sessionId = await openSession(tx, rid, table.id);
    }
    await tx.execute(sql`
      INSERT INTO sufra.requests (id, restaurant_id, session_id, table_id, kind, payment)
      VALUES (${newId("req")}, ${rid}, ${sessionId}, ${table.id}, ${kind}, ${kind === "bill" ? payment : null})
      ON CONFLICT (session_id, kind) WHERE acknowledged_at IS NULL DO UPDATE SET payment = excluded.payment`);
    await bump(tx, rid);
    return { ok: true, sessionId } as const;
  });
}
