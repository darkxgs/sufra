import "server-only";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import type { Tx } from "@/db/seed";
import type { OrderLine, ServiceRequest, Ticket } from "@/lib/types";

type Q = DB | Tx;

/** postgres.js returns rows as an array, PGlite as { rows }. */
export function rowsOf<T>(r: unknown): T[] {
  return (Array.isArray(r) ? r : ((r as { rows?: T[] }).rows ?? [])) as T[];
}

/** Every change a screen should notice bumps the restaurant's version; screens poll for it. */
export async function bump(q: Q, rid: string): Promise<number> {
  const r = rowsOf<{ version: string | number }>(await q.execute(sql`UPDATE sufra.restaurants SET version = version + 1 WHERE id = ${rid} RETURNING version`));
  return Number(r[0]?.version ?? 0);
}

export async function versionOf(q: Q, rid: string): Promise<number> {
  const [r] = await q.select({ v: s.restaurants.version }).from(s.restaurants).where(eq(s.restaurants.id, rid));
  return r ? Number(r.v) : 0;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** Orders plus their lines, shaped as tickets. */
export async function loadTickets(q: Q, where: SQL, labels: Map<string, string>): Promise<Ticket[]> {
  const orders = await q.select().from(s.orders).where(where).orderBy(asc(s.orders.createdAt));
  if (!orders.length) return [];
  const lines = await q
    .select()
    .from(s.orderItems)
    .where(inArray(s.orderItems.orderId, orders.map((o) => o.id)))
    .orderBy(asc(s.orderItems.sort));
  const byOrder = new Map<string, OrderLine[]>();
  for (const l of lines) {
    const list = byOrder.get(l.orderId) ?? [];
    list.push({ id: l.id, nameAr: l.nameAr, nameEn: l.nameEn, qty: l.qty, unitPrice: l.unitPrice, options: l.options, note: l.note, stationKey: l.stationKey, done: !!l.doneAt });
    byOrder.set(l.orderId, list);
  }
  return orders.map((o) => ({
    id: o.id,
    number: o.number,
    round: o.round,
    tableId: o.tableId,
    tableLabel: labels.get(o.tableId) ?? "?",
    status: o.status,
    source: o.source,
    subtotal: o.subtotal,
    createdAt: o.createdAt.toISOString(),
    startedAt: iso(o.startedAt),
    readyAt: iso(o.readyAt),
    servedAt: iso(o.servedAt),
    lines: byOrder.get(o.id) ?? [],
  }));
}

export async function loadRequests(q: Q, where: SQL, labels: Map<string, string>): Promise<ServiceRequest[]> {
  const rows = await q.select().from(s.requests).where(where).orderBy(asc(s.requests.createdAt));
  return rows.map((r) => ({
    id: r.id,
    tableId: r.tableId,
    tableLabel: labels.get(r.tableId) ?? "?",
    kind: r.kind,
    payment: r.payment,
    createdAt: r.createdAt.toISOString(),
    acknowledgedAt: iso(r.acknowledgedAt),
  }));
}

export async function tableLabels(q: Q, rid: string) {
  const rows = await q.select({ id: s.tables.id, label: s.tables.label }).from(s.tables).where(eq(s.tables.restaurantId, rid));
  return new Map(rows.map((r) => [r.id, r.label]));
}

export async function unavailableItems(q: Q, rid: string): Promise<string[]> {
  const rows = await q.select({ id: s.items.id }).from(s.items).where(and(eq(s.items.restaurantId, rid), eq(s.items.available, false)));
  return rows.map((r) => r.id);
}
