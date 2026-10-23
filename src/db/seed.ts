// Creates a restaurant from the Jamr seed: the public menu preview, every demo,
// and the tests all start here. Runs inside one transaction, so a demo is
// either complete or not there at all.
import { sql } from "drizzle-orm";
import { newId, newTableToken } from "@/lib/id";
import { chosen, defaultSelection, unitPrice } from "@/lib/selection";
import type { MenuItem, Tag } from "@/lib/types";
import { hashPin } from "@/server/pin";
import type { DB } from "./index";
import * as s from "./schema";
import { AREAS, MENU, RESTAURANT, STATIONS, TABLES } from "./seed-data";

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export type CreateOptions = {
  slug: string;
  pin: string;
  isDemo: boolean;
  expiresAt?: Date | null;
  ipHash?: string | null;
  /** Start with a few tables already eating, so the boards aren't empty. */
  activity?: boolean;
  now?: Date;
};

export type Created = { id: string; slug: string; tables: { id: string; label: string; token: string }[]; items: Map<string, MenuItem> };

export const dayIn = (tz: string, d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);

export async function createRestaurant(db: DB, o: CreateOptions): Promise<Created> {
  return db.transaction(async (tx) => {
    const now = o.now ?? new Date();
    const rid = newId("rst");
    await tx.insert(s.restaurants).values({
      id: rid,
      slug: o.slug,
      nameAr: RESTAURANT.nameAr,
      nameEn: RESTAURANT.nameEn,
      taglineAr: RESTAURANT.taglineAr,
      taglineEn: RESTAURANT.taglineEn,
      currency: RESTAURANT.currency,
      vatBps: RESTAURANT.vatBps,
      serviceBps: RESTAURANT.serviceBps,
      pricesIncludeVat: RESTAURANT.pricesIncludeVat,
      showCalories: RESTAURANT.showCalories,
      vatNumber: RESTAURANT.vatNumber,
      timezone: RESTAURANT.timezone,
      defaultLang: RESTAURANT.defaultLang,
      warnAfterMin: 10,
      lateAfterMin: 20,
      pinHash: hashPin(o.pin),
      demoPin: o.isDemo ? o.pin : null,
      isDemo: o.isDemo,
      expiresAt: o.expiresAt ?? null,
      ipHash: o.ipHash ?? null,
      version: 1,
      orderSeq: 0,
      orderDay: null,
      simEnabled: false,
      simNextAt: null,
      createdAt: now,
    });

    const stationIds = new Map<string, string>();
    await tx.insert(s.stations).values(
      STATIONS.map((st, i) => {
        const id = newId("stn");
        stationIds.set(st.key, id);
        return { id, restaurantId: rid, key: st.key, nameAr: st.ar, nameEn: st.en, sort: i };
      }),
    );

    const items = new Map<string, MenuItem>();
    const itemRows: (typeof s.items.$inferInsert)[] = [];
    const groupRows: (typeof s.optionGroups.$inferInsert)[] = [];
    const optionRows: (typeof s.options.$inferInsert)[] = [];
    const categoryRows: (typeof s.categories.$inferInsert)[] = [];
    MENU.forEach((c, ci) => {
      const cid = newId("cat");
      categoryRows.push({ id: cid, restaurantId: rid, nameAr: c.ar, nameEn: c.en, sort: ci });
      c.items.forEach((it, ii) => {
        const iid = newId("itm");
        itemRows.push({
          id: iid,
          restaurantId: rid,
          categoryId: cid,
          stationId: stationIds.get(it.station) ?? null,
          nameAr: it.ar,
          nameEn: it.en,
          descAr: it.descAr,
          descEn: it.descEn,
          price: it.price,
          calories: it.kcal,
          tags: it.tags ?? [],
          photo: it.photo ?? null,
          available: true,
          sort: ii,
          createdAt: now,
        });
        const menuItem: MenuItem = {
          id: iid,
          categoryId: cid,
          stationKey: it.station,
          nameAr: it.ar,
          nameEn: it.en,
          descAr: it.descAr,
          descEn: it.descEn,
          price: it.price,
          calories: it.kcal,
          tags: (it.tags ?? []) as Tag[],
          photo: it.photo ?? null,
          available: true,
          groups: [],
        };
        (it.groups ?? []).forEach((g, gi) => {
          const gid = newId("grp");
          groupRows.push({ id: gid, itemId: iid, nameAr: g.ar, nameEn: g.en, minSelect: g.min, maxSelect: g.max, sort: gi });
          const group = { id: gid, nameAr: g.ar, nameEn: g.en, min: g.min, max: g.max, options: [] as MenuItem["groups"][number]["options"] };
          g.options.forEach((op, oi) => {
            const oid = newId("opt");
            optionRows.push({ id: oid, groupId: gid, nameAr: op.ar, nameEn: op.en, priceDelta: op.delta ?? 0, caloriesDelta: op.kcal ?? 0, isDefault: !!op.default, sort: oi });
            group.options.push({ id: oid, nameAr: op.ar, nameEn: op.en, priceDelta: op.delta ?? 0, caloriesDelta: op.kcal ?? 0, isDefault: !!op.default });
          });
          menuItem.groups.push(group);
        });
        items.set(it.key, menuItem);
      });
    });
    await tx.insert(s.categories).values(categoryRows);
    await tx.insert(s.items).values(itemRows);
    if (groupRows.length) await tx.insert(s.optionGroups).values(groupRows);
    if (optionRows.length) await tx.insert(s.options).values(optionRows);

    const tables = TABLES.map((t, i) => ({
      id: newId("tbl"),
      restaurantId: rid,
      label: t.label,
      token: newTableToken(),
      seats: t.seats,
      areaAr: AREAS[t.area].ar,
      areaEn: AREAS[t.area].en,
      x: t.x,
      y: t.y,
      shape: t.shape,
      sort: i,
    }));
    await tx.insert(s.tables).values(tables);

    if (o.activity) await seedActivity(tx, rid, tables, items, now);
    return { id: rid, slug: o.slug, tables: tables.map((t) => ({ id: t.id, label: t.label, token: t.token })), items };
  });
}

type Pick = { key: string; qty?: number; options?: string[]; note?: string; done?: boolean };

/** Builds order lines from item keys, choosing options by their English names. */
function lines(items: Map<string, MenuItem>, picks: Pick[]) {
  return picks.map((p, i) => {
    const item = items.get(p.key)!;
    const ids = p.options
      ? item.groups.flatMap((g) => g.options).filter((op) => p.options!.includes(op.nameEn)).map((op) => op.id)
      : defaultSelection(item);
    return {
      id: newId("oli"),
      itemId: item.id,
      stationKey: item.stationKey,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      qty: p.qty ?? 1,
      unitPrice: unitPrice(item, ids),
      options: chosen(item, ids),
      note: p.note ?? null,
      sort: i,
      done: !!p.done,
    };
  });
}

/**
 * A dinner service already under way: one table on its second round, one that
 * just ordered, one waiting for the bill. Table 4 stays free for the visitor.
 */
async function seedActivity(tx: Tx, rid: string, tables: { id: string; label: string }[], items: Map<string, MenuItem>, now: Date) {
  const ago = (min: number) => new Date(now.getTime() - min * 60_000);
  const table = (label: string) => tables.find((t) => t.label === label)!;
  let number = 0;

  const plan: {
    table: string;
    openedMin: number;
    orders: { createdMin: number; status: s.OrderStatus; startedMin?: number; readyMin?: number; servedMin?: number; picks: Pick[] }[];
    request?: { kind: "waiter" | "bill"; payment: "cash" | "card" | null; min: number };
  }[] = [
    {
      table: "2",
      openedMin: 34,
      orders: [
        { createdMin: 31, status: "served", startedMin: 29, readyMin: 22, servedMin: 21, picks: [{ key: "hummus", options: ["Toasted pine nuts"], done: true }, { key: "fattoush", done: true }, { key: "karak", qty: 2, done: true }] },
        { createdMin: 9, status: "preparing", startedMin: 6, picks: [{ key: "mixed-grill", options: ["Vermicelli rice", "Fries"] }, { key: "ayran", qty: 2, done: true }] },
      ],
    },
    {
      table: "6",
      openedMin: 7,
      orders: [
        {
          createdMin: 2,
          status: "new",
          picks: [
            { key: "shish-tawook", options: ["Fries"], note: "بدون ثومية" },
            { key: "cheese-manakish" },
            { key: "lemon-mint", options: ["Less sugar"] },
          ],
        },
      ],
    },
    {
      table: "9",
      openedMin: 52,
      orders: [
        { createdMin: 48, status: "served", startedMin: 46, readyMin: 33, servedMin: 32, picks: [{ key: "lamb-chops", options: ["Medium", "Fries"], done: true }, { key: "tabbouleh", done: true }] },
        { createdMin: 14, status: "ready", startedMin: 12, readyMin: 1, picks: [{ key: "kunafa", options: ["To share"], done: true }, { key: "saudi-coffee", done: true }] },
      ],
      request: { kind: "bill", payment: "card", min: 1 },
    },
  ];

  for (const p of plan) {
    const t = table(p.table);
    const sid = newId("ses");
    await tx.insert(s.sessions).values({ id: sid, restaurantId: rid, tableId: t.id, openedAt: ago(p.openedMin) });
    const ordered = [...p.orders].sort((a, b) => b.createdMin - a.createdMin);
    for (const [round, o] of ordered.entries()) {
      const ls = lines(items, o.picks);
      const oid = newId("ord");
      await tx.insert(s.orders).values({
        id: oid,
        restaurantId: rid,
        sessionId: sid,
        tableId: t.id,
        number: 0,
        round: round + 1,
        status: o.status,
        idemKey: newId("seed"),
        subtotal: ls.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
        source: "guest",
        createdAt: ago(o.createdMin),
        startedAt: o.startedMin != null ? ago(o.startedMin) : null,
        readyAt: o.readyMin != null ? ago(o.readyMin) : null,
        servedAt: o.servedMin != null ? ago(o.servedMin) : null,
      });
      await tx.insert(s.orderItems).values(ls.map(({ done, ...l }) => ({ ...l, orderId: oid, doneAt: done ? ago(1) : null })));
    }
    if (p.request) {
      await tx.insert(s.requests).values({ id: newId("req"), restaurantId: rid, sessionId: sid, tableId: t.id, kind: p.request.kind, payment: p.request.payment, createdAt: ago(p.request.min) });
    }
  }

  // Number the day's orders in the order they came in.
  await tx.execute(sql`
    UPDATE sufra.orders o SET number = n.rn
    FROM (SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM sufra.orders WHERE restaurant_id = ${rid}) n
    WHERE o.id = n.id`);
  number = (await tx.select({ id: s.orders.id }).from(s.orders).where(sql`restaurant_id = ${rid}`)).length;
  await tx.execute(sql`UPDATE sufra.restaurants SET order_seq = ${number}, order_day = ${dayIn(RESTAURANT.timezone, now)} WHERE id = ${rid}`);
}
