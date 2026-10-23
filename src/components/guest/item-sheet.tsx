"use client";

import { useMemo, useState } from "react";
import { dict, pick } from "@/lib/i18n";
import { money } from "@/lib/money";
import { defaultSelection, problems, toggleOption, unitCalories, unitPrice } from "@/lib/selection";
import type { CartLine, Lang, MenuItem } from "@/lib/types";
import { Photo } from "../photo";
import { Sheet } from "../sheet";
import { buttonClass, cn, Icon } from "../ui";
import { TagIcons } from "./menu-view";

export type ItemSheetProps = {
  item: MenuItem | null;
  editing: CartLine | null;
  open: boolean;
  lang: Lang;
  currency: string;
  showCalories: boolean;
  soldOut: boolean;
  browseOnly: boolean;
  onClose: () => void;
  onSave: (line: { itemId: string; qty: number; optionIds: string[]; note: string }, replaceKey: string | null) => void;
};

export function ItemSheet(p: ItemSheetProps) {
  const t = dict(p.lang);
  const name = p.item ? pick(p.lang, p.item.nameAr, p.item.nameEn) : "";
  return (
    <Sheet
      open={p.open}
      onClose={p.onClose}
      label={name}
      closeLabel={t.guest.close}
      header={p.item ? <Photo slug={p.item.photo} alt={name} sizes="520px" className="aspect-[4/3] w-full" priority /> : undefined}
    >
      {p.item ? <ItemBody key={`${p.item.id}:${p.editing?.key ?? ""}`} {...p} item={p.item} /> : null}
    </Sheet>
  );
}

function ItemBody({ item, editing, lang, currency, showCalories, soldOut, browseOnly, onSave }: ItemSheetProps & { item: MenuItem }) {
  const t = dict(lang);
  const [selected, setSelected] = useState<string[]>(() => editing?.optionIds ?? defaultSelection(item));
  const [qty, setQty] = useState(editing?.qty ?? 1);
  const [note, setNote] = useState(editing?.note ?? "");
  const issues = useMemo(() => problems(item, selected), [item, selected]);
  const price = unitPrice(item, selected) * qty;
  const kcal = unitCalories(item, selected);
  const missing = item.groups.find((g) => issues.some((i) => i.groupId === g.id));

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-5 pt-4">
        <h2 className="text-[23px] leading-tight font-semibold text-slate">{pick(lang, item.nameAr, item.nameEn)}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#5f6669]">{pick(lang, item.descAr, item.descEn)}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14.5px]">
          <span className="font-semibold text-slate tnum">{money(item.price, currency, lang)}</span>
          {showCalories && item.calories != null ? <span className="text-[#7c8285] tnum">{t.guest.kcal(item.calories)}</span> : null}
          <TagIcons tags={item.tags} lang={lang} withLabels />
        </p>
      </div>

      {item.groups.map((g) => {
        const chosenHere = g.options.filter((o) => selected.includes(o.id)).length;
        const full = g.max > 1 && chosenHere >= g.max;
        const rule = g.max === 1 ? t.guest.chooseOne : g.min === g.max ? t.guest.chooseN(g.max) : t.guest.upTo(g.max);
        const bad = issues.some((i) => i.groupId === g.id);
        return (
          <fieldset key={g.id} className="mt-6 border-t border-black/[0.06] px-5 pt-5">
            <legend className="sr-only">{pick(lang, g.nameAr, g.nameEn)}</legend>
            <div className="flex items-baseline justify-between gap-3" aria-hidden>
              <span className="text-[16.5px] font-semibold text-slate">{pick(lang, g.nameAr, g.nameEn)}</span>
              <span className="flex items-center gap-2 text-[13px]">
                <span className="text-[#7c8285]">{rule}</span>
                <span className={cn("rounded-full px-2 py-0.5 font-medium", g.min > 0 ? (bad ? "bg-[#fbe9e2] text-[#a2453a]" : "bg-brass-soft text-brass-deep") : "bg-stone text-[#7c8285]")}>
                  {g.min > 0 ? t.guest.required : t.guest.optional}
                </span>
              </span>
            </div>
            <div className="mt-2 divide-y divide-black/[0.05]">
              {g.options.map((o) => {
                const on = selected.includes(o.id);
                const disabled = browseOnly || (!on && full);
                return (
                  <label key={o.id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 py-2.5", disabled && !browseOnly && "cursor-not-allowed opacity-45")}>
                    <input
                      type={g.max === 1 ? "radio" : "checkbox"}
                      name={g.id}
                      checked={on}
                      disabled={disabled}
                      onChange={() => setSelected((s) => toggleOption(item, s, o.id))}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-[22px] shrink-0 place-items-center border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brass/40",
                        g.max === 1 ? "rounded-full" : "rounded-[7px]",
                        on ? "border-brass bg-brass text-white" : "border-[#c5c9cb] bg-white",
                      )}
                    >
                      {on ? g.max === 1 ? <span className="size-2 rounded-full bg-white" /> : <Icon.check size={14} strokeWidth={2.6} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 text-[15.5px] text-slate">{pick(lang, o.nameAr, o.nameEn)}</span>
                    {o.priceDelta ? <span className="text-[14px] text-[#5f6669] tnum">+{money(o.priceDelta, currency, lang)}</span> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {!browseOnly ? (
        <>
          <div className="mt-6 border-t border-black/[0.06] px-5 pt-5">
            <label className="block">
              <span className="text-[16.5px] font-semibold text-slate">{t.guest.note}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 140))}
                rows={2}
                maxLength={140}
                placeholder={t.guest.notePlaceholder}
                className="mt-2 block w-full resize-none rounded-[14px] border border-black/10 bg-stone px-3.5 py-3 text-[15px] text-slate outline-none placeholder:text-[#9a9fa2] focus:border-brass/50 focus:bg-white focus-visible:outline-none"
              />
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 px-5 pb-6">
            <span className="text-[15px] font-medium text-slate">{t.guest.qty}</span>
            <Stepper value={qty} onChange={setQty} lang={lang} />
          </div>
        </>
      ) : (
        <div className="h-6" />
      )}

      <div className="sticky bottom-0 mt-auto border-t border-black/[0.06] bg-white/95 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur">
        {browseOnly ? (
          <p className="py-2 text-center text-[14.5px] text-[#5f6669]">{t.guest.browseOnly}</p>
        ) : soldOut ? (
          <p className="py-2 text-center text-[15px] font-medium text-[#a2453a]">{t.guest.soldOut}</p>
        ) : (
          <>
            {missing ? <p className="mb-2 text-center text-[13.5px] text-[#a2453a]">{t.guest.pickMore(pick(lang, missing.nameAr, missing.nameEn))}</p> : null}
            <button
              type="button"
              disabled={issues.length > 0}
              onClick={() => onSave({ itemId: item.id, qty, optionIds: selected, note: note.trim() }, editing?.key ?? null)}
              className={buttonClass("brass", "lg", "h-14 w-full justify-between rounded-[16px] px-5 text-[16px]")}
            >
              <span>{editing ? t.guest.update : t.guest.addTo}</span>
              <span className="tnum">
                {money(price, currency, lang)}
                {showCalories && kcal != null ? <span className="ms-2 text-[13px] font-normal text-white/75">{t.guest.kcal(kcal * qty)}</span> : null}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, lang, min = 1, max = 20, small = false }: { value: number; onChange: (n: number) => void; lang: Lang; min?: number; max?: number; small?: boolean }) {
  const t = dict(lang);
  const btn = cn("grid place-items-center rounded-full border border-black/10 bg-white text-slate transition active:scale-90 disabled:opacity-35", small ? "size-8" : "size-10");
  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={t.guest.less}>
        <Icon.minus size={small ? 16 : 18} />
      </button>
      <span className={cn("min-w-6 text-center font-semibold tnum", small ? "text-[15px]" : "text-[17px]")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={t.guest.more}>
        <Icon.plus size={small ? 16 : 18} />
      </button>
    </span>
  );
}
