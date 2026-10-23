import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/[lang]/staff/actions";
import type { Restaurant } from "@/db/schema";
import { dict, otherLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { Mark } from "../brand";
import { LangLink } from "../lang-link";
import { StaffNav } from "./staff-nav";

export function StaffShell({ lang, r, path, children, now }: { lang: Lang; r: Restaurant; path: string; children: ReactNode; now: number }) {
  const t = dict(lang);
  const hoursLeft = r.isDemo && r.expiresAt ? Math.max(1, Math.ceil((r.expiresAt.getTime() - now) / 3600_000)) : null;
  const other = otherLang(lang);
  return (
    <div className="min-h-dvh bg-desk">
      <header className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 pt-3 sm:px-8 lg:h-16 lg:flex-nowrap lg:pt-0">
          <Link href={`/${lang}/staff`} className="flex items-center gap-2.5" aria-label={t.staff.nav.home}>
            <Mark className="size-7 text-zaatar" />
            <span className="text-[16px] font-semibold">{pick(lang, r.nameAr, r.nameEn)}</span>
            {r.isDemo ? <span className="rounded-full bg-saffron-soft px-2 py-0.5 text-[12px] font-medium text-[#7a5410]">{t.staff.demo}</span> : null}
          </Link>
          <div className="ms-auto flex items-center gap-1 lg:order-last">
            <LangLink to={other} href={`/${other}${path}`} label={t.language} />
            <form action={signOutAction}>
              <input type="hidden" name="lang" value={lang} />
              <button type="submit" className="rounded-control px-3 py-1.5 text-[14px] text-ink-2 transition-colors hover:bg-rule-2 hover:text-ink">
                {t.staff.signOut}
              </button>
            </form>
          </div>
          <StaffNav lang={lang} />
        </div>
      </header>
      {hoursLeft ? <p className="border-b border-saffron/25 bg-saffron-soft/70 px-4 py-2 text-center text-[13.5px] text-[#7a5410]">{t.staff.expires(hoursLeft)}</p> : null}
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-9">{children}</main>
    </div>
  );
}
