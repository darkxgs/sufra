"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getConnection } from "@/db";
import * as s from "@/db/schema";
import { newTableToken } from "@/lib/id";
import { isLang } from "@/lib/i18n";
import { parseAmount } from "@/lib/money";
import type { OrderStatus, StaffSnapshot } from "@/lib/types";
import { allowAttempt, clearStaffCookie, clientIpHash, currentRestaurant, setStaffCookie } from "@/server/auth";
import { createPairCode, rotateTableToken } from "@/server/demo";
import { menuTag, restaurantBySlug } from "@/server/menu";
import { hashPin, verifyPin } from "@/server/pin";
import { acknowledgeRequest, closeSession, markLines, moveTicket, setAvailable, setSimulation, staffSnapshot } from "@/server/staff";
import { bump } from "@/server/tickets";

// Every staff action checks the signed-in restaurant first and only touches
// rows that belong to it. Kitchen and floor actions answer with a fresh
// snapshot, so the screen updates without waiting for its next poll.

async function staff() {
  const conn = await getConnection();
  const r = await currentRestaurant(conn);
  if (!r) throw new Error("signed_out");
  return { conn, r };
}

export type BoardResult = { ok: boolean; error?: "stale" | "invalid"; snapshot: StaffSnapshot };

const STATUSES: OrderStatus[] = ["new", "preparing", "ready", "served", "cancelled"];

export async function moveTicketAction(orderId: string, from: OrderStatus, to: OrderStatus): Promise<BoardResult> {
  const { conn, r } = await staff();
  if (typeof orderId !== "string" || !STATUSES.includes(from) || !STATUSES.includes(to)) return { ok: false, error: "invalid", snapshot: await staffSnapshot(conn, r.id) };
  const res = await moveTicket(conn, r.id, orderId, from, to);
  return { ok: res.ok, error: res.ok ? undefined : res.error, snapshot: await staffSnapshot(conn, r.id) };
}

export async function markLinesAction(orderId: string, lineIds: string[], done: boolean): Promise<BoardResult> {
  const { conn, r } = await staff();
  if (typeof orderId !== "string" || !Array.isArray(lineIds) || !lineIds.every((x) => typeof x === "string")) {
    return { ok: false, error: "invalid", snapshot: await staffSnapshot(conn, r.id) };
  }
  const res = await markLines(conn, r.id, orderId, lineIds, !!done);
  return { ok: res.ok, error: res.ok ? undefined : res.error, snapshot: await staffSnapshot(conn, r.id) };
}

export async function acknowledgeAction(requestId: string): Promise<BoardResult> {
  const { conn, r } = await staff();
  if (typeof requestId === "string") await acknowledgeRequest(conn, r.id, requestId);
  return { ok: true, snapshot: await staffSnapshot(conn, r.id) };
}

export async function closeTableAction(sessionId: string): Promise<BoardResult & { total?: number }> {
  const { conn, r } = await staff();
  const res = typeof sessionId === "string" ? await closeSession(conn, r.id, sessionId) : { ok: false as const };
  return { ok: res.ok, total: res.ok ? res.total : undefined, snapshot: await staffSnapshot(conn, r.id) };
}

export async function simulationAction(on: boolean): Promise<BoardResult> {
  const { conn, r } = await staff();
  if (r.isDemo) await setSimulation(conn, r.id, !!on);
  return { ok: r.isDemo, snapshot: await staffSnapshot(conn, r.id) };
}

export async function availabilityAction(itemId: string, available: boolean) {
  const { conn, r } = await staff();
  if (typeof itemId !== "string") return { ok: false };
  await setAvailable(conn, r.id, itemId, !!available);
  updateTag(menuTag(r.id));
  return { ok: true };
}

export type ItemForm = { id: string; nameAr: string; nameEn: string; descAr: string; descEn: string; price: string; calories: string; station: string };
export type ItemResult = { ok: true } | { ok: false; field: "price" | "name" | "calories" | "item" };

export async function saveItemAction(input: ItemForm): Promise<ItemResult> {
  const { conn, r } = await staff();
  const nameAr = String(input.nameAr ?? "").trim().slice(0, 80);
  const nameEn = String(input.nameEn ?? "").trim().slice(0, 80);
  if (!nameAr || !nameEn) return { ok: false, field: "name" };
  const price = parseAmount(String(input.price ?? ""), r.currency);
  if (price == null || price > 100_000_000) return { ok: false, field: "price" };
  const kcalText = String(input.calories ?? "").trim();
  const calories = kcalText === "" ? null : Number(kcalText);
  if (calories != null && (!Number.isInteger(calories) || calories < 0 || calories > 20_000)) return { ok: false, field: "calories" };
  const [item] = await conn.db.select().from(s.items).where(eq(s.items.id, String(input.id)));
  if (!item || item.restaurantId !== r.id) return { ok: false, field: "item" };
  const stations = await conn.db.select().from(s.stations).where(eq(s.stations.restaurantId, r.id));
  const station = stations.find((st) => st.key === input.station);
  await conn.db.transaction(async (tx) => {
    await tx
      .update(s.items)
      .set({
        nameAr,
        nameEn,
        descAr: String(input.descAr ?? "").trim().slice(0, 300) || null,
        descEn: String(input.descEn ?? "").trim().slice(0, 300) || null,
        price,
        calories,
        stationId: station?.id ?? item.stationId,
      })
      .where(eq(s.items.id, item.id));
    await bump(tx, r.id);
  });
  updateTag(menuTag(r.id));
  return { ok: true };
}

export async function pairCodeAction(): Promise<{ code: string; expiresAt: string }> {
  const { conn, r } = await staff();
  const p = await createPairCode(conn, r.id);
  return { code: p.code, expiresAt: p.expiresAt.toISOString() };
}

export async function rotateTokenAction(tableId: string) {
  const { conn, r } = await staff();
  if (typeof tableId !== "string") return { ok: false };
  await rotateTableToken(conn, r.id, tableId, newTableToken());
  return { ok: true };
}

export type SettingsForm = {
  nameAr: string;
  nameEn: string;
  currency: string;
  pricesIncludeVat: boolean;
  vat: string;
  service: string;
  vatNumber: string;
  showCalories: boolean;
  warnAfterMin: string;
  lateAfterMin: string;
  defaultLang: string;
};

const rate = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n * 100) : null;
};
const minutes = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 120 ? n : null;
};

export async function saveSettingsAction(f: SettingsForm): Promise<{ ok: boolean; error?: "name" | "numbers" }> {
  const { conn, r } = await staff();
  const nameAr = String(f.nameAr ?? "").trim().slice(0, 60);
  const nameEn = String(f.nameEn ?? "").trim().slice(0, 60);
  if (!nameAr || !nameEn) return { ok: false, error: "name" };
  const vatBps = rate(f.vat);
  const serviceBps = rate(f.service);
  const warn = minutes(f.warnAfterMin);
  const late = minutes(f.lateAfterMin);
  if (vatBps == null || serviceBps == null || warn == null || late == null || late <= warn) return { ok: false, error: "numbers" };
  const currency = ["SAR", "EGP", "AED", "QAR", "KWD", "BHD", "OMR", "JOD"].includes(f.currency) ? f.currency : r.currency;
  await conn.db.transaction(async (tx) => {
    await tx
      .update(s.restaurants)
      .set({
        nameAr,
        nameEn,
        currency,
        pricesIncludeVat: !!f.pricesIncludeVat,
        vatBps,
        serviceBps,
        vatNumber: String(f.vatNumber ?? "").trim().slice(0, 20) || null,
        showCalories: !!f.showCalories,
        warnAfterMin: warn,
        lateAfterMin: late,
        defaultLang: f.defaultLang === "en" ? "en" : "ar",
      })
      .where(eq(s.restaurants.id, r.id));
    await bump(tx, r.id);
  });
  updateTag(menuTag(r.id));
  return { ok: true };
}

export async function changePinAction(pin: string): Promise<{ ok: boolean; error?: "format" | "demo" }> {
  const { conn, r } = await staff();
  if (r.isDemo) return { ok: false, error: "demo" };
  if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) return { ok: false, error: "format" };
  await conn.db.update(s.restaurants).set({ pinHash: hashPin(pin) }).where(eq(s.restaurants.id, r.id));
  return { ok: true };
}

export type SignInState = { error: "wrong" | "locked" | null; code?: string };

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const lang = isLang(form.get("lang")) ? (form.get("lang") as "ar" | "en") : "ar";
  const slug = String(form.get("code") ?? "").trim().toLowerCase();
  const pin = String(form.get("pin") ?? "").replace(/\D/g, "");
  const conn = await getConnection();
  // Six digits are a million guesses: ten tries per code and address every 15 minutes.
  if (!(await allowAttempt(conn, `pin:${slug}:${await clientIpHash()}`, 10, 900))) return { error: "locked", code: slug };
  const r = await restaurantBySlug(slug);
  if (!r || !verifyPin(pin, r.pinHash) || (r.isDemo && r.expiresAt && r.expiresAt < new Date())) return { error: "wrong", code: slug };
  await setStaffCookie(r);
  redirect(`/${lang}/staff`);
}

export async function signOutAction(form: FormData) {
  await clearStaffCookie();
  const lang = isLang(form.get("lang")) ? form.get("lang") : "ar";
  redirect(`/${lang}`);
}
