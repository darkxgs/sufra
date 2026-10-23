import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getConnection, type Connection } from "@/db";
import { attempts, restaurants, type Restaurant } from "@/db/schema";

// Staff sign in to a restaurant with its code and a six-digit PIN (or by
// scanning a pairing QR), and stay signed in through a signed cookie. Guests
// never sign in: the table's QR code is their key.

export const STAFF_COOKIE = "sufra_staff";
const DAY = 86_400_000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.VERCEL_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return "sufra-local-development-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function staffToken(rid: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ rid, exp: expiresAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readStaffToken(token: string | undefined): { rid: string; exp: number } | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const want = Buffer.from(sign(payload));
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
  (await cookies()).set(STAFF_COOKIE, staffToken(r.id, exp), {
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
  const t = readStaffToken((await cookies()).get(STAFF_COOKIE)?.value);
  if (!t) return null;
  const c = conn ?? (await getConnection());
  const [r] = await c.db.select().from(restaurants).where(eq(restaurants.id, t.rid));
  if (!r) return null;
  if (r.isDemo && r.expiresAt && r.expiresAt.getTime() < Date.now()) return null;
  return r;
}

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return createHash("sha256").update(`${process.env.RATE_SALT ?? secret()}:${ip}`).digest("hex").slice(0, 32);
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
