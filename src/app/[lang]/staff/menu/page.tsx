import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import { MenuAdmin } from "@/components/staff/menu-admin";
import { StaffShell } from "@/components/staff/shell";
import { dict, isLang } from "@/lib/i18n";
import { requireStaff, serverNow } from "@/server/guard";
import { loadMenu } from "@/server/menu";

export async function generateMetadata({ params }: PageProps<"/[lang]/staff/menu">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).menuAdmin.title, robots: { index: false } } : {};
}

export default function MenuPage(props: PageProps<"/[lang]/staff/menu">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-desk" />}>
      <MenuRoute {...props} />
    </Suspense>
  );
}

async function MenuRoute({ params }: PageProps<"/[lang]/staff/menu">) {
  await connection();
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  const r = await requireStaff(lang, await getConnection());
  const menu = await loadMenu(r.id);
  if (!menu) notFound();
  return (
    <StaffShell lang={lang} r={r} path="/staff/menu" now={serverNow()}>
      <h1 className="text-[26px] font-semibold tracking-[-0.01em]">{t.menuAdmin.title}</h1>
      <p className="mt-1.5 mb-7 text-[15px] text-ink-2">{t.menuAdmin.sub}</p>
      <MenuAdmin lang={lang} menu={menu} />
    </StaffShell>
  );
}
