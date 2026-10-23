import "server-only";
import { sql } from "drizzle-orm";
import type { Connection } from "@/db";
import { rowsOf } from "./tickets";

export type Today = {
  orders: number;
  sales: number;
  avgReadyMin: number | null;
  seated: number;
  byHour: { hour: number; orders: number }[];
  top: { nameAr: string; nameEn: string; qty: number }[];
};

/** The day so far, in the restaurant's own time zone. */
export async function today(conn: Connection, rid: string, tz: string): Promise<Today> {
  const startOfDay = sql`(date_trunc('day', now() AT TIME ZONE ${tz}) AT TIME ZONE ${tz})`;
  const [[totals], hours, top, [seated]] = await Promise.all([
    conn.db.execute(sql`
      SELECT count(*)::int AS orders,
             coalesce(sum(subtotal), 0)::int AS sales,
             avg(extract(epoch FROM ready_at - created_at) / 60) FILTER (WHERE ready_at IS NOT NULL) AS avg_ready
      FROM sufra.orders
      WHERE restaurant_id = ${rid} AND status <> 'cancelled' AND created_at >= ${startOfDay}`).then((r) => rowsOf<{ orders: number; sales: number; avg_ready: string | number | null }>(r)),
    conn.db
      .execute(sql`
        SELECT extract(hour FROM created_at AT TIME ZONE ${tz})::int AS hour, count(*)::int AS orders
        FROM sufra.orders
        WHERE restaurant_id = ${rid} AND status <> 'cancelled' AND created_at >= ${startOfDay}
        GROUP BY 1 ORDER BY 1`)
      .then((r) => rowsOf<{ hour: number; orders: number }>(r)),
    conn.db
      .execute(sql`
        SELECT oi.name_ar, oi.name_en, sum(oi.qty)::int AS qty
        FROM sufra.order_items oi JOIN sufra.orders o ON o.id = oi.order_id
        WHERE o.restaurant_id = ${rid} AND o.status <> 'cancelled' AND o.created_at >= ${startOfDay}
        GROUP BY 1, 2 ORDER BY 3 DESC, 2 LIMIT 5`)
      .then((r) => rowsOf<{ name_ar: string; name_en: string; qty: number }>(r)),
    conn.db
      .execute(sql`SELECT count(*)::int AS n FROM sufra.sessions WHERE restaurant_id = ${rid} AND closed_at IS NULL`)
      .then((r) => rowsOf<{ n: number }>(r)),
  ]);
  return {
    orders: totals?.orders ?? 0,
    sales: totals?.sales ?? 0,
    avgReadyMin: totals?.avg_ready == null ? null : Math.round(Number(totals.avg_ready)),
    seated: seated?.n ?? 0,
    byHour: hours,
    top: top.map((x) => ({ nameAr: x.name_ar, nameEn: x.name_en, qty: x.qty })),
  };
}
