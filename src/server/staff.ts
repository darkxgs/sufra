import "server-only";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Connection } from "@/db";
import * as s from "@/db/schema";
import { bill } from "@/lib/money";
import { FLOW, LIVE } from "@/lib/tickets";
import type { FloorTable, OrderStatus, StaffSnapshot, Ticket } from "@/lib/types";
import { bump, loadRequests, loadTickets, rowsOf, unavailableItems } from "./tickets";

/** Everything the kitchen board and the floor plan show, in one read. */
export async function staffSnapshot(conn: Connection, rid: string): Promise<StaffSnapshot> {
  const { db } = conn;
  const [[r], tables, sessions, unavailable] = await Promise.all([
    db.select({ v: s.restaurants.version, sim: s.restaurants.simEnabled }).from(s.restaurants).where(eq(s.restaurants.id, rid)),
    db.select().from(s.tables).where(eq(s.tables.restaurantId, rid)).orderBy(asc(s.tables.sort)),
    db.select().from(s.sessions).where(and(eq(s.sessions.restaurantId, rid), isNull(s.sessions.closedAt))),
    unavailableItems(db, rid),
  ]);
  const labels = new Map(tables.map((t) => [t.id, t.label]));
  const sessionIds = sessions.map((x) => x.id);
  const [orders, requests] = await Promise.all([
    sessionIds.length ? loadTickets(db, and(inArray(s.orders.sessionId, sessionIds), ne(s.orders.status, "cancelled"))!, labels) : Promise.resolve([] as Ticket[]),
    loadRequests(db, and(eq(s.requests.restaurantId, rid), isNull(s.requests.acknowledgedAt))!, labels),
  ]);
  const floor: FloorTable[] = tables.map((t) => {
    const session = sessions.find((x) => x.tableId === t.id);
    const own = session ? orders.filter((o) => o.tableId === t.id) : [];
    return {
      id: t.id,
      label: t.label,
      seats: t.seats,
      x: t.x,
      y: t.y,
      shape: t.shape,
      areaAr: t.areaAr,
      areaEn: t.areaEn,
      token: t.token,
      session: session
        ? {
            id: session.id,
            openedAt: session.openedAt.toISOString(),
            subtotal: own.reduce((sum, o) => sum + o.subtotal, 0),
            orders: own,
            requests: requests.filter((q) => q.tableId === t.id),
          }
        : null,
    };
  });
  return {
    v: Number(r?.v ?? 0),
    now: new Date().toISOString(),
    tickets: orders.filter((o) => LIVE.includes(o.status)),
    tables: floor,
    requests,
    unavailable,
    sim: !!r?.sim,
  };
}

export type MoveResult = { ok: true } | { ok: false; error: "stale" | "invalid" };

/**
 * Moves a ticket one step along new → preparing → ready → served, or one step
 * back (a cook bumped the wrong ticket). `from` must match what the screen
 * showed, so two people tapping the same ticket can't skip it two steps.
 */
export async function moveTicket(conn: Connection, rid: string, orderId: string, from: OrderStatus, to: OrderStatus): Promise<MoveResult> {
  const fi = FLOW.indexOf(from);
  const ti = FLOW.indexOf(to);
  const cancel = to === "cancelled" && (from === "new" || from === "preparing");
  if (!cancel && (fi < 0 || ti < 0 || Math.abs(fi - ti) !== 1)) return { ok: false, error: "invalid" };
  return conn.db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(and(eq(s.orders.id, orderId), eq(s.orders.restaurantId, rid))).for("update");
    if (!o || o.status !== from) return { ok: false, error: "stale" } as const;
    const now = new Date();
    if (cancel) {
      await tx.update(s.orders).set({ status: "cancelled", cancelledAt: now }).where(eq(s.orders.id, orderId));
    } else if (ti > fi) {
      const set: Partial<typeof s.orders.$inferInsert> = { status: to };
      if (to === "preparing") set.startedAt = o.startedAt ?? now;
      if (to === "ready") {
        set.startedAt = o.startedAt ?? now;
        set.readyAt = now;
        await tx.execute(sql`UPDATE sufra.order_items SET done_at = ${now} WHERE order_id = ${orderId} AND done_at IS NULL`);
      }
      if (to === "served") set.servedAt = now;
      await tx.update(s.orders).set(set).where(eq(s.orders.id, orderId));
    } else {
      // Undo: clear what the forward step stamped, and only that.
      if (from === "preparing") await tx.update(s.orders).set({ status: to, startedAt: null }).where(eq(s.orders.id, orderId));
      if (from === "ready") {
        if (o.readyAt) await tx.execute(sql`UPDATE sufra.order_items SET done_at = NULL WHERE order_id = ${orderId} AND done_at >= ${o.readyAt}`);
        await tx.update(s.orders).set({ status: to, readyAt: null }).where(eq(s.orders.id, orderId));
      }
      if (from === "served") await tx.update(s.orders).set({ status: to, servedAt: null }).where(eq(s.orders.id, orderId));
    }
    await bump(tx, rid);
    return { ok: true } as const;
  });
}

/**
 * Marks lines done (one dish, or everything for one station). Starting work on
 * a new ticket moves it to preparing; finishing the last line makes it ready.
 */
export async function markLines(conn: Connection, rid: string, orderId: string, lineIds: string[], done: boolean): Promise<MoveResult> {
  if (!lineIds.length) return { ok: false, error: "invalid" };
  return conn.db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(and(eq(s.orders.id, orderId), eq(s.orders.restaurantId, rid))).for("update");
    if (!o || !LIVE.includes(o.status)) return { ok: false, error: "stale" } as const;
    const now = new Date();
    await tx
      .update(s.orderItems)
      .set({ doneAt: done ? now : null })
      .where(and(eq(s.orderItems.orderId, orderId), inArray(s.orderItems.id, lineIds)));
    const [{ open }] = rowsOf<{ open: number }>(await tx.execute(sql`SELECT count(*)::int AS open FROM sufra.order_items WHERE order_id = ${orderId} AND done_at IS NULL`));
    if (open === 0 && o.status !== "ready") {
      await tx.update(s.orders).set({ status: "ready", startedAt: o.startedAt ?? now, readyAt: now }).where(eq(s.orders.id, orderId));
    } else if (open > 0 && o.status === "ready") {
      await tx.update(s.orders).set({ status: "preparing", readyAt: null }).where(eq(s.orders.id, orderId));
    } else if (o.status === "new" && done) {
      await tx.update(s.orders).set({ status: "preparing", startedAt: now }).where(eq(s.orders.id, orderId));
    }
    await bump(tx, rid);
    return { ok: true } as const;
  });
}

export async function acknowledgeRequest(conn: Connection, rid: string, requestId: string) {
  await conn.db.transaction(async (tx) => {
    await tx
      .update(s.requests)
      .set({ acknowledgedAt: new Date() })
      .where(and(eq(s.requests.id, requestId), eq(s.requests.restaurantId, rid), isNull(s.requests.acknowledgedAt)));
    await bump(tx, rid);
  });
}

/**
 * The party has paid and left: the bill is totalled and kept, anything still
 * in the kitchen is cancelled, and the table is free for the next guests.
 */
export async function closeSession(conn: Connection, rid: string, sessionId: string) {
  return conn.db.transaction(async (tx) => {
    const [r] = await tx.select().from(s.restaurants).where(eq(s.restaurants.id, rid));
    const [session] = await tx.select().from(s.sessions).where(and(eq(s.sessions.id, sessionId), eq(s.sessions.restaurantId, rid), isNull(s.sessions.closedAt))).for("update");
    if (!r || !session) return { ok: false as const };
    const now = new Date();
    await tx.execute(sql`UPDATE sufra.orders SET status = 'cancelled', cancelled_at = ${now} WHERE session_id = ${sessionId} AND status IN ('new', 'preparing')`);
    await tx.execute(sql`UPDATE sufra.orders SET status = 'served', served_at = ${now} WHERE session_id = ${sessionId} AND status = 'ready'`);
    await tx.execute(sql`UPDATE sufra.requests SET acknowledged_at = ${now} WHERE session_id = ${sessionId} AND acknowledged_at IS NULL`);
    const [{ subtotal }] = rowsOf<{ subtotal: number }>(
      await tx.execute(sql`SELECT coalesce(sum(subtotal), 0)::int AS subtotal FROM sufra.orders WHERE session_id = ${sessionId} AND status <> 'cancelled'`),
    );
    const total = bill(subtotal, r).total;
    await tx.update(s.sessions).set({ closedAt: now, total }).where(eq(s.sessions.id, sessionId));
    await bump(tx, rid);
    return { ok: true as const, total };
  });
}

export async function setAvailable(conn: Connection, rid: string, itemId: string, available: boolean) {
  await conn.db.transaction(async (tx) => {
    await tx.update(s.items).set({ available }).where(and(eq(s.items.id, itemId), eq(s.items.restaurantId, rid)));
    await bump(tx, rid);
  });
}

export async function setSimulation(conn: Connection, rid: string, on: boolean) {
  await conn.db.transaction(async (tx) => {
    await tx
      .update(s.restaurants)
      .set({ simEnabled: on, simNextAt: on ? new Date(Date.now() + 8_000) : null })
      .where(eq(s.restaurants.id, rid));
    await bump(tx, rid);
  });
}
