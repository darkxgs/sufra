// Shapes shared by the server (queries, snapshots) and the client (menu, boards).
import type { ChosenOption, OrderStatus } from "@/db/schema";

export type { ChosenOption, OrderStatus };
export type Lang = "ar" | "en";
export type Tag = "signature" | "spicy" | "veg" | "nuts" | "new";

export type RestaurantInfo = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  taglineAr: string | null;
  taglineEn: string | null;
  currency: string;
  vatBps: number;
  serviceBps: number;
  pricesIncludeVat: boolean;
  showCalories: boolean;
  vatNumber: string | null;
  timezone: string;
  defaultLang: Lang;
  warnAfterMin: number;
  lateAfterMin: number;
  isDemo: boolean;
  expiresAt: string | null;
};

export type MenuOption = { id: string; nameAr: string; nameEn: string; priceDelta: number; caloriesDelta: number; isDefault: boolean };
export type MenuOptionGroup = { id: string; nameAr: string; nameEn: string; min: number; max: number; options: MenuOption[] };
export type MenuItem = {
  id: string;
  categoryId: string;
  stationKey: string | null;
  nameAr: string;
  nameEn: string;
  descAr: string | null;
  descEn: string | null;
  price: number;
  calories: number | null;
  tags: Tag[];
  photo: string | null;
  available: boolean;
  groups: MenuOptionGroup[];
};
export type MenuCategory = { id: string; nameAr: string; nameEn: string; items: MenuItem[] };
export type Station = { key: string; nameAr: string; nameEn: string };
export type Menu = { restaurant: RestaurantInfo; categories: MenuCategory[]; stations: Station[] };

/** One line in a guest's cart (kept on their phone until it's sent). */
export type CartLine = { key: string; itemId: string; qty: number; optionIds: string[]; note: string };

export type OrderLine = {
  id: string;
  nameAr: string;
  nameEn: string;
  qty: number;
  unitPrice: number;
  options: ChosenOption[];
  note: string | null;
  stationKey: string | null;
  done: boolean;
};

export type Ticket = {
  id: string;
  number: number;
  round: number;
  tableId: string;
  tableLabel: string;
  status: OrderStatus;
  source: "guest" | "staff" | "sim";
  subtotal: number;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  lines: OrderLine[];
};

export type RequestKind = "waiter" | "bill";
export type Payment = "cash" | "card";
export type ServiceRequest = { id: string; tableId: string; tableLabel: string; kind: RequestKind; payment: Payment | null; createdAt: string; acknowledgedAt: string | null };

/** What a guest's phone polls for: their table's open bill and the menu's sold-out items. */
export type GuestSnapshot = {
  v: number;
  now: string;
  session: { id: string; openedAt: string; orders: Ticket[]; requests: ServiceRequest[] } | null;
  unavailable: string[];
};

export type FloorTable = {
  id: string;
  label: string;
  seats: number;
  x: number;
  y: number;
  shape: "square" | "round" | "long";
  areaAr: string | null;
  areaEn: string | null;
  token: string;
  session: { id: string; openedAt: string; subtotal: number; orders: Ticket[]; requests: ServiceRequest[] } | null;
};

/** What the kitchen board and the floor view poll for. */
export type StaffSnapshot = {
  v: number;
  now: string;
  tickets: Ticket[];
  tables: FloorTable[];
  requests: ServiceRequest[];
  unavailable: string[];
  sim: boolean;
};
