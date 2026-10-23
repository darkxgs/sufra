// Staff PINs are hashed with scrypt. (No "server-only" import here: the seed
// script runs this under plain Node.)
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [scheme, n, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(pin, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: 8, p: 1 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
