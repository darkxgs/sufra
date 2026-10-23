import type { OrderLine, OrderStatus, Ticket } from "./types";

// A ticket moves new → preparing → ready → served. Kitchens also need to take
// a step back (a cook bumps the wrong ticket), so every move can be undone.

export const FLOW: OrderStatus[] = ["new", "preparing", "ready", "served"];
export const LIVE: OrderStatus[] = ["new", "preparing", "ready"];

export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = FLOW.indexOf(s);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

export function prevStatus(s: OrderStatus): OrderStatus | null {
  const i = FLOW.indexOf(s);
  return i > 0 ? FLOW[i - 1] : null;
}

/** The time column each status stamps, so moving back can clear it. */
export const STAMP: Partial<Record<OrderStatus, "started_at" | "ready_at" | "served_at">> = {
  preparing: "started_at",
  ready: "ready_at",
  served: "served_at",
};

export type Tone = "ok" | "warn" | "late";

export function ageTone(ms: number, warnMin: number, lateMin: number): Tone {
  const m = ms / 60_000;
  return m >= lateMin ? "late" : m >= warnMin ? "warn" : "ok";
}

/** 6:05, or 1:02:05 past an hour. Negative clock skew reads as 0:00. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** The lines a station cooks. "all" is the expo view: everything. */
export function linesFor(t: Ticket, station: string): OrderLine[] {
  return station === "all" ? t.lines : t.lines.filter((l) => l.stationKey === station);
}

/** Every line done means the ticket is ready to go out. */
export const allDone = (lines: OrderLine[]) => lines.length > 0 && lines.every((l) => l.done);

/** How long a ticket has been in the kitchen: from sending until it was ready (or now). */
export function kitchenMs(t: Pick<Ticket, "createdAt" | "readyAt">, now: number): number {
  return (t.readyAt ? new Date(t.readyAt).getTime() : now) - new Date(t.createdAt).getTime();
}

/** Where a table stands, for the floor plan: the most urgent thing about it wins. */
export type TableState = "free" | "seated" | "waiting" | "ready" | "attention" | "bill";

export function tableState(session: { orders: Pick<Ticket, "status">[]; requests: { kind: string }[] } | null): TableState {
  if (!session) return "free";
  if (session.requests.some((r) => r.kind === "bill")) return "bill";
  if (session.requests.length) return "attention";
  if (session.orders.some((o) => o.status === "ready")) return "ready";
  if (session.orders.some((o) => o.status === "new" || o.status === "preparing")) return "waiting";
  return "seated";
}
