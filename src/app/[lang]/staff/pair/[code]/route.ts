import { NextResponse } from "next/server";
import { getConnection } from "@/db";
import { isLang } from "@/lib/i18n";
import { setStaffCookie } from "@/server/auth";
import { redeemPairCode } from "@/server/demo";

/** Scanning a pairing QR signs this device in and opens the kitchen board. The code works once. */
export async function GET(req: Request, { params }: RouteContext<"/[lang]/staff/pair/[code]">) {
  const { lang: l, code } = await params;
  const lang = isLang(l) ? l : "ar";
  const r = await redeemPairCode(await getConnection(), code);
  if (!r) return NextResponse.redirect(new URL(`/${lang}/staff/login?pair=failed`, req.url));
  await setStaffCookie(r);
  return NextResponse.redirect(new URL(`/${lang}/staff/kitchen`, req.url));
}
