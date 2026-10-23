import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import * as s from "@/db/schema";
import { JamrMark } from "@/components/brand";
import { PrintButton } from "@/components/staff/print-button";
import { Qr } from "@/components/qr";
import { dict, isLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { requireStaff } from "@/server/guard";
import { publicOrigin, tableLink } from "@/server/origin";

export async function generateMetadata({ params }: PageProps<"/[lang]/staff/tables/print">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).tablesAdmin.print, robots: { index: false } } : {};
}

/**
 * Table tents: each card is folded along its middle and stood on the table.
 * The upper face is printed upside down so both sides read upright once folded.
 */
export default function PrintPage(props: PageProps<"/[lang]/staff/tables/print">) {
  return (
    <Suspense fallback={null}>
      <Print {...props} />
    </Suspense>
  );
}

async function Print({ params }: PageProps<"/[lang]/staff/tables/print">) {
  await connection();
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  const conn = await getConnection();
  const r = await requireStaff(lang, conn);
  const [tables, origin] = await Promise.all([conn.db.select().from(s.tables).where(eq(s.tables.restaurantId, r.id)).orderBy(asc(s.tables.sort)), publicOrigin()]);
  const name = { ar: r.nameAr, en: r.nameEn };
  return (
    <div className="min-h-dvh bg-[#d9ddda] py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4 portrait; margin: 6mm; } @media print { .sheet { box-shadow: none !important; margin: 0 !important; } }`}</style>
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] items-center justify-between px-2">
        <p className="text-[15px] text-ink-2">{t.tablesAdmin.sub}</p>
        <PrintButton label={t.tablesAdmin.print} />
      </div>
      {chunk(tables, 4).map((page, i) => (
        <div key={i} className="sheet mx-auto mb-8 grid w-[198mm] grid-cols-2 gap-[4mm] bg-white p-[3mm] shadow-[0_10px_30px_rgb(0_0_0/0.15)] break-after-page print:mb-0">
          {page.map((x) => (
            <div key={x.id} className="h-[138mm] border border-[#e1e4e2]">
              <Face lang={lang} name={name} label={x.label} url={tableLink(origin, x.token)} scan={t.tablesAdmin.scan} other={dict(lang === "ar" ? "en" : "ar").tablesAdmin.scan} flipped />
              <div className="relative h-0 border-t border-dashed border-[#b9c0bc]" aria-hidden />
              <Face lang={lang} name={name} label={x.label} url={tableLink(origin, x.token)} scan={t.tablesAdmin.scan} other={dict(lang === "ar" ? "en" : "ar").tablesAdmin.scan} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Face({ lang, name, label, url, scan, other, flipped = false }: { lang: Lang; name: { ar: string; en: string }; label: string; url: string; scan: string; other: string; flipped?: boolean }) {
  return (
    <div className={`flex h-[69mm] items-center gap-[5mm] px-[6mm] ${flipped ? "rotate-180" : ""}`}>
      <Qr value={url} label={label} className="size-[44mm] shrink-0 text-[#1f2324]" />
      <div className="min-w-0">
        <JamrMark lang={lang} name={pick(lang, name.ar, name.en)} className="text-[30px] text-[#1f2324]" />
        <p className="mt-[2mm] text-[22px] leading-none font-semibold text-[#1f2324]">{lang === "ar" ? `طاولة ${label}` : `Table ${label}`}</p>
        <p className="mt-[3mm] text-[11px] leading-snug text-[#3d4345]">{scan}</p>
        <p className="mt-[1mm] text-[10px] leading-snug text-[#6b7174]" lang={lang === "ar" ? "en" : "ar"} dir={lang === "ar" ? "ltr" : "rtl"}>
          {other}
        </p>
      </div>
    </div>
  );
}

function chunk<T>(list: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}
