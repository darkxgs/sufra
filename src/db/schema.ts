// Drizzle's view of the tables created in migrations.ts (the SQL there is the source of truth).
import { bigint, boolean, integer, jsonb, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

export const sufra = pgSchema("sufra");
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const restaurants = sufra.table("restaurants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  taglineAr: text("tagline_ar"),
  taglineEn: text("tagline_en"),
  currency: text("currency").notNull(),
  vatBps: integer("vat_bps").notNull(),
  serviceBps: integer("service_bps").notNull(),
  pricesIncludeVat: boolean("prices_include_vat").notNull(),
  showCalories: boolean("show_calories").notNull(),
  vatNumber: text("vat_number"),
  timezone: text("timezone").notNull(),
  defaultLang: text("default_lang").$type<"ar" | "en">().notNull(),
  warnAfterMin: integer("warn_after_min").notNull(),
  lateAfterMin: integer("late_after_min").notNull(),
  pinHash: text("pin_hash").notNull(),
  demoPin: text("demo_pin"),
  isDemo: boolean("is_demo").notNull(),
  expiresAt: ts("expires_at"),
  ipHash: text("ip_hash"),
  version: bigint("version", { mode: "number" }).notNull(),
  orderSeq: integer("order_seq").notNull(),
  orderDay: text("order_day"),
  simEnabled: boolean("sim_enabled").notNull(),
  simNextAt: ts("sim_next_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const stations = sufra.table("stations", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  key: text("key").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  sort: integer("sort").notNull(),
});

export const categories = sufra.table("categories", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  sort: integer("sort").notNull(),
});

export const items = sufra.table("items", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  categoryId: text("category_id").notNull(),
  stationId: text("station_id"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descAr: text("desc_ar"),
  descEn: text("desc_en"),
  price: integer("price").notNull(),
  calories: integer("calories"),
  tags: text("tags").array().notNull(),
  photo: text("photo"),
  available: boolean("available").notNull(),
  sort: integer("sort").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const optionGroups = sufra.table("option_groups", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  minSelect: integer("min_select").notNull(),
  maxSelect: integer("max_select").notNull(),
  sort: integer("sort").notNull(),
});

export const options = sufra.table("options", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  priceDelta: integer("price_delta").notNull(),
  caloriesDelta: integer("calories_delta").notNull(),
  isDefault: boolean("is_default").notNull(),
  sort: integer("sort").notNull(),
});

export const tables = sufra.table("tables", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  label: text("label").notNull(),
  token: text("token").notNull(),
  seats: integer("seats").notNull(),
  areaAr: text("area_ar"),
  areaEn: text("area_en"),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  shape: text("shape").$type<"square" | "round" | "long">().notNull(),
  sort: integer("sort").notNull(),
});

export const sessions = sufra.table("sessions", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  tableId: text("table_id").notNull(),
  openedAt: ts("opened_at").notNull().defaultNow(),
  closedAt: ts("closed_at"),
  total: integer("total"),
});

export type OrderStatus = "new" | "preparing" | "ready" | "served" | "cancelled";
export type ChosenOption = { groupAr: string; groupEn: string; nameAr: string; nameEn: string; delta: number };

export const orders = sufra.table("orders", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  sessionId: text("session_id").notNull(),
  tableId: text("table_id").notNull(),
  number: integer("number").notNull(),
  round: integer("round").notNull(),
  status: text("status").$type<OrderStatus>().notNull(),
  idemKey: text("idem_key").notNull(),
  subtotal: integer("subtotal").notNull(),
  source: text("source").$type<"guest" | "staff" | "sim">().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  startedAt: ts("started_at"),
  readyAt: ts("ready_at"),
  servedAt: ts("served_at"),
  cancelledAt: ts("cancelled_at"),
});

export const orderItems = sufra.table("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  itemId: text("item_id"),
  stationKey: text("station_key"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  options: jsonb("options").$type<ChosenOption[]>().notNull(),
  note: text("note"),
  doneAt: ts("done_at"),
  sort: integer("sort").notNull(),
});

export const requests = sufra.table("requests", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  sessionId: text("session_id").notNull(),
  tableId: text("table_id").notNull(),
  kind: text("kind").$type<"waiter" | "bill">().notNull(),
  payment: text("payment").$type<"cash" | "card" | null>(),
  createdAt: ts("created_at").notNull().defaultNow(),
  acknowledgedAt: ts("acknowledged_at"),
});

export const pairCodes = sufra.table("pair_codes", {
  code: text("code").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
});

export const attempts = sufra.table("attempts", {
  key: text("key").notNull(),
  at: ts("at").notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Table = typeof tables.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
