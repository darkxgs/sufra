"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dict, pick } from "@/lib/i18n";
import { money, percent } from "@/lib/money";
import { spring, SPRINGS, type SpringHandle } from "@/lib/spring";
import type { Lang, Menu, MenuItem, Tag } from "@/lib/types";
import { JamrMark } from "../brand";
import { Photo } from "../photo";
import { cn, Icon } from "../ui";

const NAV_H = 52;
const nowMs = () => Date.now();

export function TagIcons({ tags, lang, withLabels = false }: { tags: Tag[]; lang: Lang; withLabels?: boolean }) {
  const t = dict(lang).tags;
  const shown = tags.filter((x) => x !== "signature");
  if (!shown.length) return null;
  const style: Record<Tag, { icon: ReactNode; cls: string }> = {
    spicy: { icon: <Icon.chili size={15} />, cls: "text-[#b4402c]" },
    veg: { icon: <Icon.leaf size={15} />, cls: "text-[#3f7a4c]" },
    nuts: { icon: <Icon.nut size={15} />, cls: "text-[#8a6532]" },
    new: { icon: <Icon.star size={15} />, cls: "text-brass" },
    signature: { icon: null, cls: "" },
  };
  return (
    <span className="inline-flex items-center gap-2">
      {shown.map((tag) => (
        <span key={tag} className={cn("inline-flex items-center gap-1 text-[13px]", style[tag].cls)} title={t[tag]}>
          {style[tag].icon}
          {withLabels ? <span>{t[tag]}</span> : <span className="sr-only">{t[tag]}</span>}
        </span>
      ))}
    </span>
  );
}

/**
 * The menu as a guest sees it: the restaurant's cover and name, categories
 * that follow the scroll, and dishes with photo, price and calories. Ordering
 * hooks in through `onOpen`; without it the menu is browse-only (/m/slug).
 */
export function MenuView({
  menu,
  lang,
  tableLabel,
  unavailable,
  inCart,
  onOpen,
  actions,
  langHref,
}: {
  menu: Menu;
  lang: Lang;
  tableLabel?: string;
  unavailable: Set<string>;
  inCart?: Map<string, number>;
  onOpen: (item: MenuItem) => void;
  actions?: ReactNode;
  langHref: string;
}) {
  const t = dict(lang);
  const r = menu.restaurant;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return menu.categories
      .flatMap((c) => c.items)
      .filter((i) => [i.nameAr, i.nameEn, i.descAr ?? "", i.descEn ?? ""].some((s) => s.toLowerCase().includes(q)));
  }, [menu, q]);

  return (
    <div className="guest mx-auto min-h-dvh max-w-[640px] bg-white pb-36 text-slate">
      <header className="relative h-[232px] overflow-hidden sm:h-[260px]">
        <Photo slug="cover" cover alt="" priority sizes="(max-width: 640px) 100vw, 640px" className="absolute inset-0" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_20_21/0.86),rgb(18_20_21/0.25)_55%,rgb(18_20_21/0.35))]" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
          {tableLabel ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[14px] font-medium text-white backdrop-blur-md">
              <Icon.table size={17} />
              {t.guest.table(tableLabel)}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {actions}
            <Link
              href={langHref}
              hrefLang={lang === "ar" ? "en" : "ar"}
              lang={lang === "ar" ? "en" : "ar"}
              onClick={() => {
                document.cookie = `sufra_lang=${lang === "ar" ? "en" : "ar"}; path=/; max-age=31536000; samesite=lax`;
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[14px] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
            >
              <Icon.globe size={16} />
              {t.language}
            </Link>
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-5 text-white">
          <JamrMark lang={lang} name={pick(lang, r.nameAr, r.nameEn)} className={cn(lang === "ar" ? "text-[58px]" : "text-[52px]")} />
          <p className="mt-2 text-[15px] text-white/85">{pick(lang, r.taglineAr, r.taglineEn)}</p>
        </div>
      </header>

      <div className="space-y-1 px-5 pt-4 text-[13px] leading-relaxed text-[#6b7174]">
        <p>{r.pricesIncludeVat ? t.guest.vatIncluded : t.guest.vatExcluded(r.serviceBps ? percent(r.serviceBps) : "", percent(r.vatBps))}</p>
        {r.showCalories ? <p>{t.guest.calories}</p> : null}
      </div>

      <div className="px-4 pt-3">
        <label className="flex h-11 items-center gap-2 rounded-full bg-stone px-4 text-[#6b7174] focus-within:ring-2 focus-within:ring-brass/30">
          <Icon.search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder={t.guest.search}
            aria-label={t.guest.search}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-slate outline-none placeholder:text-[#8d9396] focus-visible:outline-none"
          />
        </label>
      </div>

      {q ? (
        <div className="px-5 pt-4">
          {results.length ? (
            <ul className="divide-y divide-black/[0.06]">
              {results.map((item) => (
                <ItemRow key={item.id} item={item} lang={lang} currency={r.currency} showCalories={r.showCalories} soldOut={unavailable.has(item.id) || !item.available} count={inCart?.get(item.id) ?? 0} onOpen={onOpen} />
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-[15px] text-[#6b7174]">{t.guest.noResults}</p>
          )}
        </div>
      ) : (
        <Sections menu={menu} lang={lang} unavailable={unavailable} inCart={inCart} onOpen={onOpen} />
      )}

      <footer className="mt-10 space-y-2 px-5 text-center text-[12.5px] leading-relaxed text-[#8d9396]">
        {r.vatNumber ? <p>{lang === "ar" ? `الرقم الضريبي ${r.vatNumber}` : `VAT no. ${r.vatNumber}`}</p> : null}
        <p>{t.footer.fictional}</p>
        <p>{t.guest.footer}</p>
      </footer>
    </div>
  );
}

function Sections({ menu, lang, unavailable, inCart, onOpen }: { menu: Menu; lang: Lang; unavailable: Set<string>; inCart?: Map<string, number>; onOpen: (i: MenuItem) => void }) {
  const r = menu.restaurant;
  const [active, setActive] = useState(menu.categories[0]?.id ?? "");
  const strip = useRef<HTMLDivElement>(null);
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const bar = useRef<HTMLSpanElement>(null);
  const pos = useRef({ x: 0, w: 0 });
  const springs = useRef<SpringHandle[]>([]);
  const lockUntil = useRef(0);

  // Which section is under the sticky bar: the last one whose top has passed it.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (nowMs() < lockUntil.current) return;
      let current = menu.categories[0]?.id ?? "";
      for (const c of menu.categories) {
        const el = document.getElementById(`cat-${c.id}`);
        if (el && el.getBoundingClientRect().top <= NAV_H + 24) current = c.id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [menu]);

  // The underline springs to the active tab; the strip scrolls to keep it in view.
  useEffect(() => {
    const tab = tabs.current.get(active);
    const el = bar.current;
    if (!tab || !el || !strip.current) return;
    const to = { x: tab.offsetLeft + 12, w: tab.offsetWidth - 24 };
    springs.current.forEach((s) => s.stop());
    const first = pos.current.w === 0;
    const apply = () => {
      el.style.transform = `translateX(${pos.current.x}px)`;
      el.style.width = `${pos.current.w}px`;
    };
    if (first) {
      pos.current = to;
      apply();
    } else {
      springs.current = [
        spring({ from: pos.current.x, to: to.x, config: SPRINGS.snappy, onUpdate: (v) => ((pos.current.x = v), apply()) }),
        spring({ from: pos.current.w, to: to.w, config: SPRINGS.snappy, onUpdate: (v) => ((pos.current.w = v), apply()) }),
      ];
    }
    // Centre the tab in the strip. offsetLeft and scrollLeft share an origin in both directions
    // (in right-to-left, scrollLeft runs from 0 into negatives), so one formula serves both.
    const s = strip.current;
    s.scrollTo({ left: tab.offsetLeft - s.clientWidth / 2 + tab.offsetWidth / 2, behavior: first ? "auto" : "smooth" });
  }, [active]);

  useEffect(() => () => springs.current.forEach((s) => s.stop()), []);

  const go = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    lockUntil.current = nowMs() + 900;
    setActive(id);
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_H - 4;
    window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <>
      <nav className="sticky top-0 z-20 mt-3 border-b border-black/[0.07] bg-white/92 backdrop-blur-md" style={{ height: NAV_H }} aria-label={lang === "ar" ? "أقسام القائمة" : "Menu sections"}>
        <div ref={strip} className="no-scrollbar relative flex h-full items-stretch overflow-x-auto px-2">
          {menu.categories.map((c) => (
            <button
              key={c.id}
              ref={(el) => {
                if (el) tabs.current.set(c.id, el);
              }}
              type="button"
              onClick={() => go(c.id)}
              aria-current={active === c.id ? "true" : undefined}
              className={cn("shrink-0 px-3 text-[15px] whitespace-nowrap transition-colors", active === c.id ? "font-medium text-slate" : "text-[#7a8083]")}
            >
              {pick(lang, c.nameAr, c.nameEn)}
            </button>
          ))}
          <span ref={bar} className="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full bg-brass" style={{ width: 0 }} aria-hidden />
        </div>
      </nav>
      {menu.categories.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-14 px-5 pt-7" aria-labelledby={`h-${c.id}`}>
          <h2 id={`h-${c.id}`} className={cn("text-slate", lang === "ar" ? "font-ruqaa text-[30px] leading-[1.3]" : "text-[22px] font-semibold tracking-[-0.01em]")}>
            {pick(lang, c.nameAr, c.nameEn)}
          </h2>
          <ul className="mt-1 divide-y divide-black/[0.06]">
            {c.items.map((item) => (
              <ItemRow key={item.id} item={item} lang={lang} currency={r.currency} showCalories={r.showCalories} soldOut={unavailable.has(item.id) || !item.available} count={inCart?.get(item.id) ?? 0} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function ItemRow({
  item,
  lang,
  currency,
  showCalories,
  soldOut,
  count,
  onOpen,
}: {
  item: MenuItem;
  lang: Lang;
  currency: string;
  showCalories: boolean;
  soldOut: boolean;
  count: number;
  onOpen: (i: MenuItem) => void;
}) {
  const t = dict(lang);
  const name = pick(lang, item.nameAr, item.nameEn);
  return (
    <li>
      <button type="button" onClick={() => onOpen(item)} className={cn("group flex w-full gap-4 py-4 text-start", soldOut && "opacity-55")}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[16.5px] leading-snug font-medium text-slate">{name}</span>
            {item.tags.includes("signature") ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brass-soft px-2 py-0.5 text-[12px] font-medium text-brass-deep">
                <Icon.star size={12} />
                {t.tags.signature}
              </span>
            ) : null}
          </span>
          <span className="mt-1 line-clamp-2 block text-[14px] leading-relaxed text-[#6b7174]">{pick(lang, item.descAr, item.descEn)}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
            {soldOut ? <span className="font-medium text-[#a2453a]">{t.guest.soldOut}</span> : <span className="font-semibold text-slate tnum">{money(item.price, currency, lang)}</span>}
            {showCalories && item.calories != null ? <span className="text-[#8d9396] tnum">{t.guest.kcal(item.calories)}</span> : null}
            <TagIcons tags={item.tags} lang={lang} />
          </span>
        </span>
        <span className="relative shrink-0 self-start">
          <Photo slug={item.photo} alt={name} className="size-[104px] rounded-[18px]" sizes="104px" />
          {!soldOut ? (
            <span
              className={cn(
                "absolute -bottom-2 end-2 grid size-9 place-items-center rounded-full shadow-[0_2px_10px_rgb(0_0_0/0.18)] transition-transform group-active:scale-90",
                count ? "bg-brass text-white" : "bg-white text-slate",
              )}
              aria-hidden
            >
              {count ? <span key={count} className="animate-pop text-[14px] font-semibold tnum">{count}</span> : <Icon.plus size={18} />}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
