import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConnection } from "@/db";
import { GuestApp } from "@/components/guest/guest-app";
import { MenuSkeleton } from "@/components/guest/skeleton";
import { dict, isLang, otherLang, pick } from "@/lib/i18n";
import { guestSnapshot } from "@/server/guest";
import { getMenu, tableByToken } from "@/server/menu";

export const viewport: Viewport = { themeColor: "#23282a" };

export async function generateMetadata({ params }: PageProps<"/[lang]/t/[token]">): Promise<Metadata> {
  await connection();
  const { lang, token } = await params;
  if (!isLang(lang)) return {};
  const table = await tableByToken(token);
  const menu = table ? await getMenu(table.restaurantId) : null;
  if (!table || !menu) return { title: dict(lang).errors.notFoundTitle };
  return {
    title: { absolute: `${pick(lang, menu.restaurant.nameAr, menu.restaurant.nameEn)} | ${dict(lang).guest.table(table.label)}` },
    robots: { index: false },
  };
}

export default function GuestPage(props: PageProps<"/[lang]/t/[token]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <Guest {...props} />
    </Suspense>
  );
}

async function Guest({ params }: PageProps<"/[lang]/t/[token]">) {
  await connection();
  const { lang, token } = await params;
  if (!isLang(lang)) notFound();
  const table = await tableByToken(token);
  if (!table) notFound();
  const menu = await getMenu(table.restaurantId);
  if (!menu) notFound();
  const initial = await guestSnapshot(await getConnection(), table);
  return <GuestApp lang={lang} menu={menu} token={token} tableLabel={table.label} initial={initial} langHref={`/${otherLang(lang)}/t/${token}`} />;
}
