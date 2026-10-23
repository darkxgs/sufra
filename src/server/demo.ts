import "server-only";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Connection } from "@/db";
import * as s from "@/db/schema";
import { createRestaurant } from "@/db/seed";
import { newPairCode, newPin } from "@/lib/id";
import { allowAttempt } from "./auth";
import { claim } from "./jobs";
import { bump } from "./tickets";

const DEMO_HOURS = 24;
const MAX_DEMOS = 400;

export type DemoResult = { ok: true; restaurant: s.Restaurant } | { ok: false; error: "rate" | "full" };

/** Every visitor gets their own copy of Jamr for a day, with dinner already under way. */
export async function startDemo(conn: Connection, ipHash: string): Promise<DemoResult> {
  // Eight demos an hour per visitor in production; local development isn't limited.
  const perHour = process.env.NODE_ENV === "production" ? 8 : 10_000;
  if (!(await allowAttempt(conn, `demo:${ipHash}`, perHour, 3600))) return { ok: false, error: "rate" };
  const [{ n }] = await conn.db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.restaurants)
    .where(and(eq(s.restaurants.isDemo, true), gt(s.restaurants.expiresAt, new Date())));
  if (n >= MAX_DEMOS) {
    await cleanup(conn);
    return { ok: false, error: "full" };
  }
  const slug = `demo-${newPairCode().slice(0, 5)}`;
  const created = await createRestaurant(conn.db, {
    slug,
    pin: newPin(),
    isDemo: true,
    expiresAt: new Date(Date.now() + DEMO_HOURS * 3600_000),
    ipHash,
    activity: true,
  });
  const [restaurant] = await conn.db.select().from(s.restaurants).where(eq(s.restaurants.id, created.id));
  return { ok: true, restaurant };
}

/** Expired demos go (everything in them cascades), and old bookkeeping is trimmed. */
export async function cleanup(conn: Connection) {
  const now = new Date();
  const removed = await conn.db
    .delete(s.restaurants)
    .where(and(eq(s.restaurants.isDemo, true), lt(s.restaurants.expiresAt, now)))
    .returning({ id: s.restaurants.id });
  await conn.db.delete(s.attempts).where(lt(s.attempts.at, new Date(now.getTime() - 86_400_000)));
  await conn.db.delete(s.pairCodes).where(lt(s.pairCodes.expiresAt, now));
  // A table nobody closed overnight is closed for them, so the next party starts clean.
  await conn.db.execute(sql`UPDATE sufra.sessions SET closed_at = ${now} WHERE closed_at IS NULL AND opened_at < ${new Date(now.getTime() - 12 * 3600_000)}`);
  return { removed: removed.length };
}

export async function cleanupIfDue(conn: Connection) {
  if (await claim(conn, "cleanup", 3600)) await cleanup(conn);
}

const PAIR_MINUTES = 10;

/** A one-time sign-in link for another screen (the kitchen tablet), shown as a QR. */
export async function createPairCode(conn: Connection, rid: string) {
  const code = newPairCode();
  const expiresAt = new Date(Date.now() + PAIR_MINUTES * 60_000);
  await conn.db.insert(s.pairCodes).values({ code, restaurantId: rid, expiresAt });
  return { code, expiresAt };
}

export async function redeemPairCode(conn: Connection, code: string): Promise<s.Restaurant | null> {
  if (!/^[a-z0-9]{16}$/.test(code)) return null;
  const used = await conn.db
    .update(s.pairCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(s.pairCodes.code, code), isNull(s.pairCodes.usedAt), gt(s.pairCodes.expiresAt, new Date())))
    .returning({ rid: s.pairCodes.restaurantId });
  if (!used.length) return null;
  const [r] = await conn.db.select().from(s.restaurants).where(eq(s.restaurants.id, used[0].rid));
  return r ?? null;
}

/** New QR codes for a table, for when an old printout has wandered off. */
export async function rotateTableToken(conn: Connection, rid: string, tableId: string, token: string) {
  await conn.db.transaction(async (tx) => {
    await tx.update(s.tables).set({ token }).where(and(eq(s.tables.id, tableId), eq(s.tables.restaurantId, rid)));
    await bump(tx, rid);
  });
}
