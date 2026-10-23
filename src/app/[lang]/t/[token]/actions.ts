"use server";

import { getConnection } from "@/db";
import type { Payment, RequestKind } from "@/lib/types";
import { placeOrder, requestService, type PlaceResult, type RequestResult } from "@/server/guest";
import { tableByToken } from "@/server/menu";

// Guests act through the table's code; there's nothing else to authenticate.
// Arguments arrive from a phone, so their shape is checked before use.

type LineIn = { itemId: unknown; qty: unknown; optionIds: unknown; note?: unknown };

export async function sendOrder(token: string, idemKey: string, lines: LineIn[]): Promise<PlaceResult> {
  const table = typeof token === "string" ? await tableByToken(token) : null;
  if (!table) return { ok: false, error: "table" };
  if (!Array.isArray(lines) || typeof idemKey !== "string") return { ok: false, error: "invalid" };
  const clean = [];
  for (const l of lines) {
    if (!l || typeof l.itemId !== "string" || typeof l.qty !== "number" || !Array.isArray(l.optionIds) || !l.optionIds.every((o) => typeof o === "string")) {
      return { ok: false, error: "invalid" };
    }
    clean.push({ itemId: l.itemId, qty: l.qty, optionIds: l.optionIds as string[], note: typeof l.note === "string" ? l.note : "" });
  }
  return placeOrder(await getConnection(), table, { token, idemKey, lines: clean });
}

export async function askService(token: string, kind: RequestKind, payment: Payment | null): Promise<RequestResult | { ok: false; error: "table" }> {
  const table = typeof token === "string" ? await tableByToken(token) : null;
  if (!table) return { ok: false, error: "table" };
  if (kind !== "waiter" && kind !== "bill") return { ok: false, error: "table" };
  const pay = payment === "cash" || payment === "card" ? payment : null;
  return requestService(await getConnection(), table, kind, pay);
}
