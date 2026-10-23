import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import { PairPanel } from "@/components/staff/pair-panel";
import { SettingsFormView } from "@/components/staff/settings-form";
import { StaffShell } from "@/components/staff/shell";
import { dict, isLang } from "@/lib/i18n";
import { createPairCode } from "@/server/demo";
import { requireStaff, serverNow } from "@/server/guard";
import { restaurantInfo } from "@/server/menu";
import { publicOrigin } from "@/server/origin";

export async function generateMetadata({ params }: PageProps<"/[lang]/staff/settings">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).settings.title, robots: { index: false } } : {};
}

export default function SettingsPage(props: PageProps<"/[lang]/staff/settings">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-desk" />}>
      <Settings {...props} />
    </Suspense>
  );
}

async function Settings({ params }: PageProps<"/[lang]/staff/settings">) {
  await connection();
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const conn = await getConnection();
  const r = await requireStaff(lang, conn);
  const [pair, origin] = await Promise.all([createPairCode(conn, r.id), publicOrigin()]);
  return (
    <StaffShell lang={lang} r={r} path="/staff/settings" now={serverNow()}>
      <h1 className="mb-7 text-[26px] font-semibold tracking-[-0.01em]">{dict(lang).settings.title}</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <SettingsFormView lang={lang} r={restaurantInfo(r)} />
        <PairPanel lang={lang} origin={origin} pinLine={null} initial={{ code: pair.code, expiresAt: pair.expiresAt.toISOString() }} />
      </div>
    </StaffShell>
  );
}
