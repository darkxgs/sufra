import { NextResponse, type NextRequest } from "next/server";

/**
 * Links without a language (the short ones printed in table QR codes, and "/")
 * go to the visitor's language: their earlier choice, else their phone's.
 * Arabic is the default for everyone else.
 */
export function proxy(req: NextRequest) {
  const saved = req.cookies.get("sufra_lang")?.value;
  const first = (req.headers.get("accept-language") ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const lang = saved === "ar" || saved === "en" ? saved : first.startsWith("en") ? "en" : "ar";
  const path = req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname;
  return NextResponse.redirect(new URL(`/${lang}${path}${req.nextUrl.search}`, req.url));
}

export const config = { matcher: ["/", "/t/:path*", "/m/:path*", "/staff/:path*"] };
