import type { Metadata } from "next";
import "@fontsource-variable/rubik/wght.css";
import "./globals.css";
import Link from "next/link";
import { Mark } from "@/components/brand";

export const metadata: Metadata = { title: "Not found | Sufra" };

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-dvh bg-desk text-ink">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6">
          <Link href="/" className="self-start" aria-label="Sufra">
            <Mark className="size-9 text-zaatar" />
          </Link>
          <h1 className="mt-8 text-[28px] leading-tight font-semibold">لا شيء بهذا الرابط</h1>
          <p className="mt-2 text-[16px] text-ink-2">ربما كُتب الرابط بشكل خاطئ.</p>
          <p lang="en" dir="ltr" className="mt-6 text-right text-[16px] text-ink-2">
            Nothing at this address. The link may be mistyped.
          </p>
          <Link href="/" className="mt-8 inline-flex h-11 items-center self-start rounded-control bg-zaatar px-5 text-[15px] font-medium text-white">
            سفرة / Sufra
          </Link>
        </main>
      </body>
    </html>
  );
}
