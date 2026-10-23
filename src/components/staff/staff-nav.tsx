"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { cn } from "../ui";

const ITEMS = ["home", "kitchen", "floor", "menu", "tables", "settings"] as const;

export function StaffNav({ lang }: { lang: Lang }) {
  const t = dict(lang).staff.nav;
  const path = usePathname();
  return (
    <nav className="no-scrollbar -mx-1 flex w-full gap-1 overflow-x-auto lg:mx-0 lg:w-auto" aria-label={t.home}>
      {ITEMS.map((key) => {
        const href = key === "home" ? `/${lang}/staff` : `/${lang}/staff/${key}`;
        const on = key === "home" ? path === href : path.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex h-12 shrink-0 items-center px-3 text-[14.5px] transition-colors lg:h-16",
              on ? "font-medium text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[2.5px] after:rounded-full after:bg-zaatar" : "text-muted hover:text-ink",
            )}
          >
            {t[key]}
          </Link>
        );
      })}
    </nav>
  );
}
