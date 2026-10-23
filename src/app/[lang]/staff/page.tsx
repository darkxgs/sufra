import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import { HourChart } from "@/components/staff/charts";
import { TopItems } from "@/components/staff/top-items";
import { PairPanel } from "@/components/staff/pair-panel";
import { StaffShell } from "@/components/staff/shell";
import { Qr } from "@/components/qr";
import { buttonClass } from "@/components/ui";
import { dict, isLang, pick } from "@/lib/i18n";
import { money } from "@/lib/money";
import { cleanupIfDue, createPairCode } from "@/server/demo";
import { requireStaff, serverNow } from "@/server/guard";
import { today } from "@/server/insights";
import { publicOrigin, tableLink } from "@/server/origin";
import { staffSnapshot } from "@/server/staff";

export async function generateMetadata({ params }: PageProps<"/[lang]/staff">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).home.title, robots: { index: false } } : {};
}

export default function StaffHome(props: PageProps<"/[lang]/staff">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-desk" />}>
      <Home {...props} />
    </Suspense>
  );
}

async function Home({ params }: PageProps<"/[lang]/staff">) {
  await connection();
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  const conn = await getConnection();
  const r = await requireStaff(lang, conn);
  void cleanupIfDue(conn).catch(() => {});
  const [stats, snap, origin] = await Promise.all([today(conn, r.id, r.timezone), staffSnapshot(conn, r.id), publicOrigin()]);
  const now = serverNow();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: r.timezone }).format(now)) % 24;
  const guestTable = snap.tables.find((x) => x.label === "4") ?? snap.tables[0];
  const pair = r.isDemo ? await createPairCode(conn, r.id) : null;
  const stat = (label: string, value: string) => (
    <div className="rounded-[16px] border border-rule bg-paper px-5 py-4">
      <p className="text-[13.5px] text-muted">{label}</p>
      <p className="mt-1 text-[30px] leading-tight font-semibold tracking-[-0.01em]">{value}</p>
    </div>
  );

  return (
    <StaffShell lang={lang} r={r} path="/staff" now={now}>
      {r.isDemo && guestTable && pair ? (
        <section className="mb-9 grid gap-4 lg:grid-cols-2" aria-labelledby="try">
          <h2 id="try" className="sr-only">
            {t.home.tryTitle}
          </h2>
          <div className="flex gap-5 rounded-[20px] border border-rule bg-paper p-5 sm:p-6">
            <Qr value={tableLink(origin, guestTable.token)} label={t.home.tryGuest} className="size-[132px] shrink-0 text-ink" />
            <div className="min-w-0">
              <h3 className="text-[18px] font-semibold">{t.home.tryGuest}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{t.home.tryGuestBody}</p>
              <Link href={`/${lang}/t/${guestTable.token}`} target="_blank" className={buttonClass("outline", "sm", "mt-4")}>
                {t.home.openHere}
              </Link>
            </div>
          </div>
          <PairPanel lang={lang} origin={origin} pinLine={r.demoPin ? t.home.pinLine(r.slug, r.demoPin) : null} initial={{ code: pair.code, expiresAt: pair.expiresAt.toISOString() }} />
        </section>
      ) : null}

      <h1 className="text-[26px] font-semibold tracking-[-0.01em]">{t.home.title}</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat(t.home.stats.orders, String(stats.orders))}
        {stat(t.home.stats.sales, money(stats.sales, r.currency, lang))}
        {stat(t.home.stats.ticket, stats.avgReadyMin == null ? t.home.none : t.home.minutes(stats.avgReadyMin))}
        {stat(t.home.stats.open, `${stats.seated}/${snap.tables.length}`)}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-[16px] border border-rule bg-paper p-5 sm:p-6">
          <h2 className="mb-5 text-[16px] font-semibold">{t.home.hours}</h2>
          {stats.orders ? (
            <HourChart data={stats.byHour} lang={lang} currentHour={hour} caption={t.home.hours} />
          ) : (
            <p className="py-10 text-center text-[14.5px] text-muted">{t.home.nothingYet}</p>
          )}
        </section>
        <section className="rounded-[16px] border border-rule bg-paper p-5 sm:p-6">
          <h2 className="mb-5 text-[16px] font-semibold">{t.home.top}</h2>
          {stats.top.length ? (
            <TopItems items={stats.top.map((x) => ({ name: pick(lang, x.nameAr, x.nameEn), qty: x.qty, label: t.home.timesOrdered(x.qty) }))} />
          ) : (
            <p className="py-10 text-center text-[14.5px] text-muted">{t.home.nothingYet}</p>
          )}
        </section>
      </div>
    </StaffShell>
  );
}
