import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BrowseMenu } from "@/components/guest/browse-menu";
import { MenuSkeleton } from "@/components/guest/skeleton";
import { isLang, otherLang, pick } from "@/lib/i18n";
import { getMenu, restaurantBySlug } from "@/server/menu";

export const viewport: Viewport = { themeColor: "#23282a" };

export async function generateMetadata({ params }: PageProps<"/[lang]/m/[slug]">): Promise<Metadata> {
  await connection();
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const r = await restaurantBySlug(slug);
  if (!r) return {};
  return { title: { absolute: pick(lang, r.nameAr, r.nameEn) }, description: pick(lang, r.taglineAr, r.taglineEn) };
}

/** A restaurant's menu without a table: for Instagram bios and maps listings. Browsing only. */
export default function PublicMenuPage(props: PageProps<"/[lang]/m/[slug]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <PublicMenu {...props} />
    </Suspense>
  );
}

async function PublicMenu({ params }: PageProps<"/[lang]/m/[slug]">) {
  await connection();
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const r = await restaurantBySlug(slug);
  if (!r || r.isDemo) notFound();
  const menu = await getMenu(r.id);
  if (!menu) notFound();
  return <BrowseMenu lang={lang} menu={menu} langHref={`/${otherLang(lang)}/m/${slug}`} />;
}
