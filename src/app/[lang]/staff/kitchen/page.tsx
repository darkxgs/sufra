import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import { KitchenBoard } from "@/components/kitchen/kitchen-board";
import { dict, isLang } from "@/lib/i18n";
import { requireStaff } from "@/server/guard";
import { getMenu } from "@/server/menu";
import { staffSnapshot } from "@/server/staff";

export const viewport: Viewport = { themeColor: "#111617" };

export async function generateMetadata({ params }: PageProps<"/[lang]/staff/kitchen">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).kitchen.title, robots: { index: false } } : {};
}

export default function KitchenPage(props: PageProps<"/[lang]/staff/kitchen">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-steel" />}>
      <Kitchen {...props} />
    </Suspense>
  );
}

async function Kitchen({ params }: PageProps<"/[lang]/staff/kitchen">) {
  await connection();
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const conn = await getConnection();
  const r = await requireStaff(lang, conn);
  const [menu, initial] = await Promise.all([getMenu(r.id), staffSnapshot(conn, r.id)]);
  if (!menu) notFound();
  return <KitchenBoard lang={lang} restaurant={menu.restaurant} stations={menu.stations} initial={initial} />;
}
