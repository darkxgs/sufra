import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { getConnection, type Connection } from "@/db";
import * as s from "@/db/schema";
import { createRestaurant, type Created } from "@/db/seed";
import { createPairCode, cleanup, redeemPairCode } from "@/server/demo";
import { guestSnapshot, placeOrder, requestService } from "@/server/guest";
import { verifyPin } from "@/server/pin";
import { maybeSimulate } from "@/server/sim";
import { acknowledgeRequest, closeSession, markLines, moveTicket, setAvailable, setSimulation, staffSnapshot } from "@/server/staff";
import { readStaffToken, staffToken } from "@/server/auth";
import { appKey } from "@/server/keys";
import { rawQuery } from "@/db/raw";

let conn: Connection;
let r: Created;
const table = async (label: string) => (await conn.db.select().from(s.tables).where(and(eq(s.tables.restaurantId, r.id), eq(s.tables.label, label))))[0];
const item = (key: string) => r.items.get(key)!;
const opt = (key: string, nameEn: string) => item(key).groups.flatMap((g) => g.options).find((o) => o.nameEn === nameEn)!.id;
let idem = 0;
const key = () => `test-key-${++idem}-${Date.now()}`;

beforeAll(async () => {
  conn = await getConnection();
  r = await createRestaurant(conn.db, { slug: "test-house", pin: "482913", isDemo: true, expiresAt: new Date(Date.now() + 3600_000), activity: true });
});

describe("a demo restaurant", () => {
  it("opens mid-service: tickets in every column and a table asking for the bill", async () => {
    const snap = await staffSnapshot(conn, r.id);
    const byTable = Object.fromEntries(snap.tickets.map((t) => [t.tableLabel, t.status]));
    expect(byTable).toEqual({ "2": "preparing", "6": "new", "9": "ready" });
    expect(snap.requests).toMatchObject([{ tableLabel: "9", kind: "bill", payment: "card" }]);
    expect(snap.tables.find((t) => t.label === "4")!.session).toBeNull();
    // The day's order numbers follow the order the tickets came in.
    expect([...snap.tickets].sort((a, b) => a.number - b.number).map((t) => t.tableLabel)).toEqual(["9", "2", "6"]);
  });

  it("keeps the PIN hashed", async () => {
    const [row] = await conn.db.select().from(s.restaurants).where(eq(s.restaurants.id, r.id));
    expect(row.pinHash).not.toContain("482913");
    expect(verifyPin("482913", row.pinHash)).toBe(true);
    expect(verifyPin("000000", row.pinHash)).toBe(false);
  });
});

describe("ordering from a table", () => {
  it("sends a round to the kitchen with prices worked out on the server", async () => {
    const t4 = await table("4");
    const res = await placeOrder(conn, t4, {
      token: t4.token,
      idemKey: key(),
      lines: [
        { itemId: item("mixed-grill").id, qty: 1, optionIds: [opt("mixed-grill", "Fries"), opt("mixed-grill", "Hummus")], note: "  Sauce on the side  " },
        { itemId: item("karak").id, qty: 2, optionIds: [opt("karak", "Less sugar")] },
      ],
    });
    // Five orders came in before the visitor sat down.
    expect(res).toMatchObject({ ok: true, number: 6, round: 1, duplicate: false });
    const g = await guestSnapshot(conn, t4);
    expect(g.session!.orders).toHaveLength(1);
    const [o] = g.session!.orders;
    expect(o.status).toBe("new");
    expect(o.subtotal).toBe(16500 + 2 * 900);
    expect(o.lines[0]).toMatchObject({ nameEn: "Mixed grill for two", note: "Sauce on the side", stationKey: "grill" });
    expect(o.lines[0].options.map((x) => x.nameEn)).toEqual(["Fries", "Hummus"]);
  });

  it("doesn't order twice when the phone retries", async () => {
    const t4 = await table("4");
    const k = key();
    const input = { token: t4.token, idemKey: k, lines: [{ itemId: item("ayran").id, qty: 1, optionIds: [] }] };
    const a = await placeOrder(conn, t4, input);
    const b = await placeOrder(conn, t4, input);
    expect(a.ok && b.ok && a.orderId === b.orderId).toBe(true);
    expect(b).toMatchObject({ duplicate: true, round: 2 });
  });

  it("refuses choices the menu doesn't allow", async () => {
    const t4 = await table("4");
    const oneSide = await placeOrder(conn, t4, { token: t4.token, idemKey: key(), lines: [{ itemId: item("mixed-grill").id, qty: 1, optionIds: [opt("mixed-grill", "Fries")] }] });
    expect(oneSide).toEqual({ ok: false, error: "invalid" });
    const foreign = await placeOrder(conn, t4, { token: t4.token, idemKey: key(), lines: [{ itemId: item("ayran").id, qty: 1, optionIds: [opt("karak", "No sugar")] }] });
    expect(foreign).toEqual({ ok: false, error: "invalid" });
    const tooMany = await placeOrder(conn, t4, { token: t4.token, idemKey: key(), lines: [{ itemId: item("ayran").id, qty: 99, optionIds: [] }] });
    expect(tooMany).toEqual({ ok: false, error: "invalid" });
  });

  it("names the dishes that sold out while the guest was choosing", async () => {
    const t4 = await table("4");
    await setAvailable(conn, r.id, item("hummus").id, false);
    const res = await placeOrder(conn, t4, {
      token: t4.token,
      idemKey: key(),
      lines: [
        { itemId: item("hummus").id, qty: 1, optionIds: [] },
        { itemId: item("bread").id, qty: 1, optionIds: [] },
      ],
    });
    expect(res).toEqual({ ok: false, error: "unavailable", itemIds: [item("hummus").id] });
    expect((await guestSnapshot(conn, t4)).unavailable).toEqual([item("hummus").id]);
    await setAvailable(conn, r.id, item("hummus").id, true);
  });
});

describe("the kitchen", () => {
  const ticketFor = async (label: string, round?: number) =>
    (await staffSnapshot(conn, r.id)).tickets.find((t) => t.tableLabel === label && (round == null || t.round === round))!;

  it("moves a ticket one step, and refuses a stale double tap", async () => {
    const t = await ticketFor("4", 1);
    expect(await moveTicket(conn, r.id, t.id, "new", "preparing")).toEqual({ ok: true });
    expect(await moveTicket(conn, r.id, t.id, "new", "preparing")).toEqual({ ok: false, error: "stale" });
    expect(await moveTicket(conn, r.id, t.id, "preparing", "served")).toEqual({ ok: false, error: "invalid" });
    expect((await ticketFor("4", 1)).startedAt).not.toBeNull();
  });

  it("makes a ticket ready when each station has finished its part", async () => {
    const t = await ticketFor("4", 1);
    const grill = t.lines.filter((l) => l.stationKey === "grill").map((l) => l.id);
    const bar = t.lines.filter((l) => l.stationKey === "bar").map((l) => l.id);
    await markLines(conn, r.id, t.id, bar, true);
    expect((await ticketFor("4", 1)).status).toBe("preparing");
    await markLines(conn, r.id, t.id, grill, true);
    const ready = await ticketFor("4", 1);
    expect(ready.status).toBe("ready");
    expect(ready.readyAt).not.toBeNull();
    // Un-ticking a dish takes the ticket back.
    await markLines(conn, r.id, t.id, grill, false);
    expect((await ticketFor("4", 1)).status).toBe("preparing");
  });

  it("undoing 'ready' only reopens the dishes that bump closed", async () => {
    const t = await ticketFor("4", 1);
    expect(t.lines.find((l) => l.stationKey === "bar")!.done).toBe(true);
    await moveTicket(conn, r.id, t.id, "preparing", "ready");
    expect((await ticketFor("4", 1)).lines.every((l) => l.done)).toBe(true);
    await moveTicket(conn, r.id, t.id, "ready", "preparing");
    const back = await ticketFor("4", 1);
    expect(back.lines.find((l) => l.stationKey === "bar")!.done).toBe(true);
    expect(back.lines.find((l) => l.stationKey === "grill")!.done).toBe(false);
  });
});

describe("service requests and the bill", () => {
  it("keeps one open bill request per table and updates how they'll pay", async () => {
    const t4 = await table("4");
    expect(await requestService(conn, t4, "bill", "card")).toMatchObject({ ok: true });
    expect(await requestService(conn, t4, "bill", "cash")).toMatchObject({ ok: true });
    const open = (await staffSnapshot(conn, r.id)).requests.filter((q) => q.tableLabel === "4");
    expect(open).toMatchObject([{ kind: "bill", payment: "cash" }]);
    await acknowledgeRequest(conn, r.id, open[0].id);
    const g = await guestSnapshot(conn, t4);
    expect(g.session!.requests[0].acknowledgedAt).not.toBeNull();
  });

  it("won't take a bill request from a table that hasn't ordered", async () => {
    expect(await requestService(conn, await table("1"), "bill", "card")).toEqual({ ok: false, error: "no_order" });
  });

  it("closes the table: totals the bill, cancels what never left the kitchen, frees the table", async () => {
    const t4 = await table("4");
    const first = (await staffSnapshot(conn, r.id)).tickets.find((t) => t.tableLabel === "4" && t.round === 1)!;
    await moveTicket(conn, r.id, first.id, "preparing", "ready");
    await moveTicket(conn, r.id, first.id, "ready", "served");
    const session = (await staffSnapshot(conn, r.id)).tables.find((t) => t.label === "4")!.session!;
    // Round 2 (an ayran) is still new: closing cancels it and leaves it off the bill.
    const res = await closeSession(conn, r.id, session.id);
    expect(res).toEqual({ ok: true, total: first.subtotal });
    const after = await staffSnapshot(conn, r.id);
    expect(after.tables.find((t) => t.label === "4")!.session).toBeNull();
    expect(after.tickets.some((t) => t.tableLabel === "4")).toBe(false);
    expect((await guestSnapshot(conn, t4)).session).toBeNull();
    // The next party at table 4 starts a new bill at round 1.
    const next = await placeOrder(conn, t4, { token: t4.token, idemKey: key(), lines: [{ itemId: item("bread").id, qty: 1, optionIds: [] }] });
    expect(next).toMatchObject({ ok: true, round: 1 });
  });
});

describe("the busy-night simulator", () => {
  it("adds work only while switched on, one claim at a time", async () => {
    expect(await maybeSimulate(conn, r.id)).toBe(false);
    await setSimulation(conn, r.id, true);
    await conn.db.execute(sql`UPDATE sufra.restaurants SET sim_next_at = now() - interval '1 second' WHERE id = ${r.id}`);
    const before = (await staffSnapshot(conn, r.id)).v;
    const [a, b] = await Promise.all([maybeSimulate(conn, r.id), maybeSimulate(conn, r.id)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect((await staffSnapshot(conn, r.id)).v).toBeGreaterThan(before);
    await setSimulation(conn, r.id, false);
  });
});

describe("signing in another screen", () => {
  it("accepts a pairing code once", async () => {
    const { code } = await createPairCode(conn, r.id);
    expect((await redeemPairCode(conn, code))?.id).toBe(r.id);
    expect(await redeemPairCode(conn, code)).toBeNull();
  });
});

describe("cleanup", () => {
  it("removes expired demos and everything in them", async () => {
    const old = await createRestaurant(conn.db, { slug: "old-demo", pin: "111111", isDemo: true, expiresAt: new Date(Date.now() - 1000), activity: true });
    await cleanup(conn);
    expect((await conn.db.select().from(s.restaurants).where(eq(s.restaurants.id, old.id))).length).toBe(0);
    expect((await conn.db.select().from(s.orders).where(eq(s.orders.restaurantId, old.id))).length).toBe(0);
    expect((await conn.db.select().from(s.restaurants).where(eq(s.restaurants.id, r.id))).length).toBe(1);
  });
});

describe("keys and staff sessions", () => {
  it("makes its own keys once, keeps them in the database, and signs staff cookies with them", async () => {
    const session = await appKey("session");
    expect(session.length).toBeGreaterThanOrEqual(40);
    expect(await appKey("session")).toBe(session);
    expect(await appKey("rate")).not.toBe(session);
    const rows = await rawQuery<{ name: string; value: string }>(conn.raw, `SELECT name, value FROM sufra.app_keys ORDER BY name`);
    expect(rows.map((k) => k.name)).toEqual(["rate", "session"]);
    expect(rows.find((k) => k.name === "session")!.value).toBe(session);

    const exp = Date.now() + 60_000;
    const token = await staffToken(r.id, exp);
    expect(await readStaffToken(token)).toEqual({ rid: r.id, exp });
    const [payload, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ rid: "rst_other", exp })).toString("base64url");
    expect(await readStaffToken(`${forged}.${mac}`)).toBeNull();
    expect(await readStaffToken(`${payload}.${mac.slice(0, -2)}xx`)).toBeNull();
    expect(await readStaffToken(await staffToken(r.id, Date.now() - 1000))).toBeNull();
  });
});
