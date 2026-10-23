"use server";

import { redirect } from "next/navigation";
import { getConnection } from "@/db";
import { isLang } from "@/lib/i18n";
import { clientIpHash, setStaffCookie } from "@/server/auth";
import { startDemo } from "@/server/demo";

export type DemoState = { error: "rate" | "full" | null };

/** Makes this visitor their own copy of Jamr and signs them in to it. */
export async function startDemoAction(_prev: DemoState, form: FormData): Promise<DemoState> {
  const lang = isLang(form.get("lang")) ? (form.get("lang") as "ar" | "en") : "ar";
  const conn = await getConnection();
  const res = await startDemo(conn, await clientIpHash());
  if (!res.ok) return { error: res.error };
  await setStaffCookie(res.restaurant);
  redirect(`/${lang}/staff`);
}
