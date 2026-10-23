// The public Jamr menu (/m/jamr) needs one permanent restaurant. Its PIN is
// random and thrown away: nobody signs in to it; demos get their own copies.
import { sql } from "drizzle-orm";
import { newPin } from "@/lib/id";
import type { DB } from "./index";
import { createRestaurant } from "./seed";
import { RESTAURANT } from "./seed-data";

export async function ensureShowcase(db: DB) {
  const found = await db.execute(sql`SELECT 1 FROM sufra.restaurants WHERE slug = ${RESTAURANT.slug}`);
  const rows = Array.isArray(found) ? found : (found as { rows: unknown[] }).rows;
  if (rows.length) return;
  try {
    await createRestaurant(db, { slug: RESTAURANT.slug, pin: newPin(), isDemo: false });
  } catch (e) {
    // Two cold starts racing: the unique slug lets exactly one win.
    if (!/duplicate key|unique/i.test(String(e))) throw e;
  }
}
