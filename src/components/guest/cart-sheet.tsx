"use client";

import { dict, pick } from "@/lib/i18n";
import { bill, money, percent } from "@/lib/money";
import { chosen, unitPrice } from "@/lib/selection";
import type { CartLine, Lang, MenuItem, RestaurantInfo } from "@/lib/types";
import { Sheet } from "../sheet";
import { buttonClass, cn, Icon, Spinner } from "../ui";
import { Stepper } from "./item-sheet";

export type CartState = { phase: "editing" } | { phase: "sent"; number: number } | { phase: "error"; message: string; badItems?: string[] };

export function BillRows({ subtotal, r, lang, className }: { subtotal: number; r: RestaurantInfo; lang: Lang; className?: string }) {
  const t = dict(lang).cart;
  const b = bill(subtotal, r);
  const m = (n: number) => money(n, r.currency, lang);
  return (
    <dl className={cn("grid grid-cols-[1fr_auto] gap-y-1.5 text-[15px]", className)}>
      <dt className="text-[#5f6669]">{t.subtotal}</dt>
      <dd className="text-end tnum">{m(b.subtotal)}</dd>
      {b.service ? (
        <>
          <dt className="text-[#5f6669]">{t.service(percent(r.serviceBps))}</dt>
          <dd className="text-end tnum">{m(b.service)}</dd>
        </>
      ) : null}
      {b.vatIncluded ? null : (
        <>
          <dt className="text-[#5f6669]">{t.vat(percent(r.vatBps))}</dt>
          <dd className="text-end tnum">{m(b.vat)}</dd>
        </>
      )}
      <dt className="mt-1.5 border-t border-black/[0.07] pt-2.5 text-[17px] font-semibold">{t.total}</dt>
      <dd className="mt-1.5 border-t border-black/[0.07] pt-2.5 text-end text-[17px] font-semibold tnum">{m(b.total)}</dd>
      {b.vatIncluded && r.vatBps ? (
        <>
          <dt className="text-[13px] text-[#7c8285]">{t.vatIn(percent(r.vatBps))}</dt>
          <dd className="text-end text-[13px] text-[#7c8285] tnum">{m(b.vat)}</dd>
        </>
      ) : null}
    </dl>
  );
}

export function CartSheet({
  open,
  onClose,
  lang,
  restaurant,
  lines,
  items,
  state,
  sending,
  onQty,
  onRemove,
  onEdit,
  onSend,
  onFollow,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  restaurant: RestaurantInfo;
  lines: CartLine[];
  items: Map<string, MenuItem>;
  state: CartState;
  sending: boolean;
  onQty: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onEdit: (line: CartLine) => void;
  onSend: () => void;
  onFollow: () => void;
}) {
  const t = dict(lang);
  const subtotal = lines.reduce((s, l) => {
    const item = items.get(l.itemId);
    return item ? s + unitPrice(item, l.optionIds) * l.qty : s;
  }, 0);
  const bad = state.phase === "error" ? new Set(state.badItems ?? []) : new Set<string>();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={t.cart.title}
      closeLabel={t.guest.close}
      header={
        <div className="px-5 pt-8 pb-2">
          <h2 className="text-[22px] font-semibold text-slate">{state.phase === "sent" ? "" : t.cart.title}</h2>
        </div>
      }
    >
      {state.phase === "sent" ? (
        <div className="flex flex-col items-center px-6 pt-2 pb-10 text-center">
          <span className="grid size-20 animate-pop place-items-center rounded-full bg-brass text-white">
            <Icon.check size={40} strokeWidth={2.2} />
          </span>
          <h3 className="mt-5 text-[22px] font-semibold text-slate">{t.cart.sentTitle(state.number)}</h3>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-[#5f6669]">{t.cart.sentBody}</p>
          <div className="mt-7 grid w-full max-w-xs gap-2.5">
            <button type="button" className={buttonClass("brass", "lg", "h-13 rounded-[14px]")} onClick={onFollow}>
              {t.cart.follow}
            </button>
            <button type="button" className={buttonClass("brass-outline", "lg", "h-13 rounded-[14px]")} onClick={onClose}>
              {t.cart.backToMenu}
            </button>
          </div>
        </div>
      ) : lines.length === 0 ? (
        <p className="px-5 pt-2 pb-12 text-[15px] text-[#5f6669]">{t.cart.empty}</p>
      ) : (
        <div className="flex min-h-full flex-col">
          <ul className="divide-y divide-black/[0.06] px-5">
            {lines.map((l) => {
              const item = items.get(l.itemId);
              if (!item) return null;
              const opts = chosen(item, l.optionIds).map((o) => pick(lang, o.nameAr, o.nameEn));
              const isBad = bad.has(item.id);
              return (
                <li key={l.key} className={cn("py-4", isBad && "rounded-[12px] bg-[#fbeee9] px-3 -mx-3")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-medium text-slate">{pick(lang, item.nameAr, item.nameEn)}</p>
                      {opts.length ? <p className="mt-0.5 text-[14px] text-[#5f6669]">{opts.join(lang === "ar" ? "، " : ", ")}</p> : null}
                      {l.note ? <p className="mt-1 text-[14px] text-brass-deep">“{l.note}”</p> : null}
                    </div>
                    <p className="shrink-0 text-[15px] font-semibold text-slate tnum">{money(unitPrice(item, l.optionIds) * l.qty, restaurant.currency, lang)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Stepper value={l.qty} onChange={(n) => onQty(l.key, n)} lang={lang} small />
                    <span className="flex gap-1">
                      {item.groups.length ? (
                        <button type="button" className={buttonClass("ghost", "sm", "text-[#5f6669]")} onClick={() => onEdit(l)}>
                          {t.cart.edit}
                        </button>
                      ) : null}
                      <button type="button" className={buttonClass("ghost", "sm", "text-[#a2453a] hover:text-[#a2453a]")} onClick={() => onRemove(l.key)}>
                        {t.cart.remove}
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-5 pt-3 pb-5">
            <BillRows subtotal={subtotal} r={restaurant} lang={lang} />
          </div>
          <div className="sticky bottom-0 mt-auto border-t border-black/[0.06] bg-white/95 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur">
            {state.phase === "error" ? (
              <p role="alert" className="mb-2.5 rounded-[12px] bg-[#fbeee9] px-3.5 py-2.5 text-[14px] leading-relaxed text-[#8f3a30]">
                {state.message}
              </p>
            ) : (
              <p className="mb-2.5 text-center text-[13px] text-[#7c8285]">{t.cart.sendNote}</p>
            )}
            <button type="button" onClick={onSend} disabled={sending} className={buttonClass("brass", "lg", "h-14 w-full rounded-[16px] text-[16px]")}>
              {sending ? <Spinner /> : null}
              {sending ? t.cart.sending : t.cart.send}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
