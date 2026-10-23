import "server-only";
import { headers } from "next/headers";

/**
 * The address QR codes point at. A fixed public URL wins; otherwise the host
 * this page was opened on, so a laptop on the restaurant's Wi-Fi can print
 * codes that phones on the same network can open.
 */
export async function publicOrigin(): Promise<string> {
  if (process.env.SUFRA_PUBLIC_URL) return process.env.SUFRA_PUBLIC_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** For metadata (no request in scope): the configured or production origin. */
export function staticOrigin(): string {
  if (process.env.SUFRA_PUBLIC_URL) return process.env.SUFRA_PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** The short link printed in a table's QR code; the proxy adds the guest's language. */
export const tableLink = (origin: string, token: string) => `${origin}/t/${token}`;
