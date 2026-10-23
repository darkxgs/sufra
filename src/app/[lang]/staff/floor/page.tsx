import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import { FloorView } from "@/components/staff/floor-view";
import { StaffShell } from "@/components/staff/shell";
import { dict, isLang } from "@/lib/i18n";
import { requireStaff, serverNow } from "@/server/guard";
import { restaurantInfo } from "@/server/menu";
import { staffSnapshot } from "@/server/staff";

export async function generateMetadata({ params }: PageProps<"/[lang]/staff/floor">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).floor.title, robots: { index: false } } : {};
}

export default function FloorPage(props: PageProps<"/[lang]/staff/floor">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-desk" />}>
      <Floor {...props} />
    </Suspense>
  );
}

async function Floor({ params }: PageProps<"/[lang]/staff/floor">) {
  await connection();
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const conn = await getConnection();
  const r = await requireStaff(lang, conn);
  const initial = await staffSnapshot(conn, r.id);
  return (
    <StaffShell lang={lang} r={r} path="/staff/floor" now={serverNow()}>
      <h1 className="mb-6 text-[26px] font-semibold tracking-[-0.01em]">{dict(lang).floor.title}</h1>
      <FloorView lang={lang} restaurant={restaurantInfo(r)} initial={initial} />
    </StaffShell>
  );
}
