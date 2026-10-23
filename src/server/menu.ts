import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getConnection } from "@/db";
import * as s from "@/db/schema";
import type { Menu, MenuItem, RestaurantInfo, Tag } from "@/lib/types";

export const menuTag = (rid: string) => `menu:${rid}`;

export function restaurantInfo(r: s.Restaurant): RestaurantInfo {
  return {
    id: r.id,
    slug: r.slug,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    taglineAr: r.taglineAr,
    taglineEn: r.taglineEn,
    currency: r.currency,
    vatBps: r.vatBps,
    serviceBps: r.serviceBps,
    pricesIncludeVat: r.pricesIncludeVat,
    showCalories: r.showCalories,
    vatNumber: r.vatNumber,
    timezone: r.timezone,
    defaultLang: r.defaultLang,
    warnAfterMin: r.warnAfterMin,
    lateAfterMin: r.lateAfterMin,
    isDemo: r.isDemo,
    expiresAt: r.expiresAt?.toISOString() ?? null,
  };
}

/**
 * A restaurant's whole menu. Cached and tagged, so staff edits refresh it at
 * once while guests' phones read it from the cache; sold-out flags also travel
 * in each live poll, so a guest's open menu catches up within seconds.
 */
export async function getMenu(rid: string): Promise<Menu | null> {
  "use cache";
  cacheTag(menuTag(rid));
  cacheLife({ stale: 60, revalidate: 900, expire: 86_400 });
  return loadMenu(rid);
}

export async function loadMenu(rid: string): Promise<Menu | null> {
  const { db } = await getConnection();
  const [r] = await db.select().from(s.restaurants).where(eq(s.restaurants.id, rid));
  if (!r) return null;
  const [cats, items, stations] = await Promise.all([
    db.select().from(s.categories).where(eq(s.categories.restaurantId, rid)).orderBy(asc(s.categories.sort)),
    db.select().from(s.items).where(eq(s.items.restaurantId, rid)).orderBy(asc(s.items.sort)),
    db.select().from(s.stations).where(eq(s.stations.restaurantId, rid)).orderBy(asc(s.stations.sort)),
  ]);
  const itemIds = items.map((i) => i.id);
  const groups = itemIds.length ? await db.select().from(s.optionGroups).where(inArray(s.optionGroups.itemId, itemIds)).orderBy(asc(s.optionGroups.sort)) : [];
  const opts = groups.length ? await db.select().from(s.options).where(inArray(s.options.groupId, groups.map((g) => g.id))).orderBy(asc(s.options.sort)) : [];
  const stationKey = new Map(stations.map((st) => [st.id, st.key]));

  const toItem = (i: s.Item): MenuItem => ({
    id: i.id,
    categoryId: i.categoryId,
    stationKey: i.stationId ? (stationKey.get(i.stationId) ?? null) : null,
    nameAr: i.nameAr,
    nameEn: i.nameEn,
    descAr: i.descAr,
    descEn: i.descEn,
    price: i.price,
    calories: i.calories,
    tags: i.tags as Tag[],
    photo: i.photo,
    available: i.available,
    groups: groups
      .filter((g) => g.itemId === i.id)
      .map((g) => ({
        id: g.id,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        min: g.minSelect,
        max: g.maxSelect,
        options: opts
          .filter((o) => o.groupId === g.id)
          .map((o) => ({ id: o.id, nameAr: o.nameAr, nameEn: o.nameEn, priceDelta: o.priceDelta, caloriesDelta: o.caloriesDelta, isDefault: o.isDefault })),
      })),
  });

  return {
    restaurant: restaurantInfo(r),
    categories: cats.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, items: items.filter((i) => i.categoryId === c.id).map(toItem) })),
    stations: stations.map((st) => ({ key: st.key, nameAr: st.nameAr, nameEn: st.nameEn })),
  };
}

export async function tableByToken(token: string) {
  if (!/^[a-z0-9]{6,20}$/.test(token)) return null;
  const { db } = await getConnection();
  const [t] = await db.select().from(s.tables).where(eq(s.tables.token, token));
  return t ?? null;
}

export async function restaurantBySlug(slug: string) {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return null;
  const { db } = await getConnection();
  const [r] = await db.select().from(s.restaurants).where(eq(s.restaurants.slug, slug));
  return r ?? null;
}
