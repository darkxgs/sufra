import "server-only";
import { redirect } from "next/navigation";
import type { Connection } from "@/db";
import type { Restaurant } from "@/db/schema";
import type { Lang } from "@/lib/types";
import { currentRestaurant } from "./auth";

/** The signed-in restaurant for a staff page, or off to the sign-in page. */
export async function requireStaff(lang: Lang, conn?: Connection): Promise<Restaurant> {
  const r = await currentRestaurant(conn);
  if (!r) redirect(`/${lang}/staff/login`);
  return r;
}

/** The server's clock, read outside component bodies (render stays pure). */
export const serverNow = () => Date.now();
