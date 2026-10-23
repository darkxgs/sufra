import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getConnection, type Connection } from "@/db";
import { attempts, restaurants, type Restaurant } from "@/db/schema";
import { appKey } from "./keys";

// Staff sign in to a restaurant with its code and a six-digit PIN (or by
// scanning a pairing QR), and stay signed in through a signed cookie. Guests
// never sign in: the table's QR code is their key.

export const STAFF_COOKIE = "sufra_staff";
const DAY = 86_400_000;

const sign = async (payload: string) => createHmac("sha256", await appKey("session")).update(payload).digest("base64url");

export async function staffToken(rid: string, expiresAt: number): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ rid, exp: expiresAt })).toString("base64url");
  return `${payload}.${await sign(payload)}`;
}

export async function readStaffToken(token: string | undefined): Promise<{ rid: string; exp: number } | null> {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const want = Buffer.from(await sign(payload));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString()) as { rid: string; exp: number };
    return typeof v.rid === "string" && v.exp > Date.now() ? v : null;
  } catch {
    return null;
  }
}

/** Signs this browser in to a restaurant. Demo sessions end when the demo does. */
export async function setStaffCookie(r: Pick<Restaurant, "id" | "expiresAt">) {
  const exp = r.expiresAt ? r.expiresAt.getTime() : Date.now() + 30 * DAY;
  (await cookies()).set(STAFF_COOKIE, await staffToken(r.id, exp), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearStaffCookie() {
  (await cookies()).delete(STAFF_COOKIE);
}

/** The signed-in restaurant, or null. Expired demos count as signed out. */
export async function currentRestaurant(conn?: Connection): Promise<Restaurant | null> {
  const t = await readStaffToken((await cookies()).get(STAFF_COOKIE)?.value);
  if (!t) return null;
  const c = conn ?? (await getConnection());
  const [r] = await c.db.select().from(restaurants).where(eq(restaurants.id, t.rid));
  if (!r) return null;
  if (r.isDemo && r.expiresAt && r.expiresAt.getTime() < Date.now()) return null;
  return r;
}

/** The visitor's address, keyed and hashed for rate limits; the address itself is never stored. */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return createHmac("sha256", await appKey("rate")).update(ip).digest("hex").slice(0, 32);
}

/**
 * Counts an attempt against a sliding window and says whether it's allowed.
 * Used for PIN attempts (so a six-digit PIN can't be guessed) and demo creation.
 */
export async function allowAttempt(conn: Connection, key: string, max: number, windowSec: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSec * 1000);
  const [{ n }] = await conn.db.select({ n: sql<number>`count(*)::int` }).from(attempts).where(and(eq(attempts.key, key), gt(attempts.at, since)));
  if (n >= max) return false;
  await conn.db.insert(attempts).values({ key, at: new Date() });
  return true;
}
