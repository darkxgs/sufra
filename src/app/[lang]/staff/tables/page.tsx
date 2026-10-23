import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import * as s from "@/db/schema";
import { Qr } from "@/components/qr";
import { RotateButton } from "@/components/staff/rotate-button";
import { StaffShell } from "@/components/staff/shell";
import { buttonClass } from "@/components/ui";
import { dict, isLang, pick } from "@/lib/i18n";
import { requireStaff, serverNow } from "@/server/guard";
import { publicOrigin, tableLink } from "@/server/origin";

export async function generateMetadata({ params }: PageProps<"/[lang]/staff/tables">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).tablesAdmin.title, robots: { index: false } } : {};
}

export default function TablesPage(props: PageProps<"/[lang]/staff/tables">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-desk" />}>
      <Tables {...props} />
    </Suspense>
  );
}

async function Tables({ params }: PageProps<"/[lang]/staff/tables">) {
  await connection();
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  const conn = await getConnection();
  const r = await requireStaff(lang, conn);
  const [tables, origin] = await Promise.all([conn.db.select().from(s.tables).where(eq(s.tables.restaurantId, r.id)).orderBy(asc(s.tables.sort)), publicOrigin()]);
  return (
    <StaffShell lang={lang} r={r} path="/staff/tables" now={serverNow()}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em]">{t.tablesAdmin.title}</h1>
          <p className="mt-1.5 max-w-[60ch] text-[15px] text-ink-2">{t.tablesAdmin.sub}</p>
        </div>
        <Link href={`/${lang}/staff/tables/print`} target="_blank" className={buttonClass("primary", "md")}>
          {t.tablesAdmin.print}
        </Link>
      </div>
      <ul className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {tables.map((x) => (
          <li key={x.id} className="rounded-[18px] border border-rule bg-paper p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[20px] font-semibold">{t.guest.table(x.label)}</p>
              <p className="text-[13px] text-muted">
                {pick(lang, x.areaAr, x.areaEn)}
                <span className="ms-2">{t.tablesAdmin.seats(x.seats)}</span>
              </p>
            </div>
            <Qr value={tableLink(origin, x.token)} label={t.guest.table(x.label)} className="mx-auto mt-4 size-[150px] text-ink" />
            <p className="mt-3 text-center text-[12.5px] text-muted" dir="ltr">
              /t/{x.token}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href={`/${lang}/t/${x.token}`} target="_blank" className={buttonClass("outline", "sm")}>
                {t.tablesAdmin.open}
              </Link>
              <RotateButton tableId={x.id} label={t.tablesAdmin.newCode} hint={t.tablesAdmin.newCodeHint} />
            </div>
          </li>
        ))}
      </ul>
    </StaffShell>
  );
}
