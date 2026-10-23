"use client";

import { useState } from "react";
import { clockTime, waited } from "@/lib/format";
import { dict, pick } from "@/lib/i18n";
import { money } from "@/lib/money";
import type { GuestSnapshot, Lang, Payment, RestaurantInfo, Ticket } from "@/lib/types";
import { Sheet } from "../sheet";
import { buttonClass, cn, Icon, Spinner } from "../ui";
import { BillRows } from "./cart-sheet";

const STEPS = ["new", "preparing", "ready", "served"] as const;

export function TableSheet({
  open,
  onClose,
  lang,
  restaurant,
  tableLabel,
  session,
  ended,
  now,
  busy,
  onAsk,
  onNewVisit,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  restaurant: RestaurantInfo;
  tableLabel: string;
  session: GuestSnapshot["session"];
  ended: boolean;
  now: number;
  busy: "waiter" | "bill" | null;
  onAsk: (kind: "waiter" | "bill", payment: Payment | null) => void;
  onNewVisit: () => void;
}) {
  const t = dict(lang);
  const [choosingPay, setChoosingPay] = useState(false);
  const orders = session?.orders ?? [];
  const waiter = session?.requests.find((r) => r.kind === "waiter");
  const billReq = session?.requests.find((r) => r.kind === "bill");
  const subtotal = orders.reduce((s, o) => s + o.subtotal, 0);
  const payLabel = (p: Payment | null) => (p === "cash" ? t.table.cash : p === "card" ? t.table.card : "");

  return (
    <Sheet
      open={open}
      onClose={() => {
        setChoosingPay(false);
        onClose();
      }}
      label={t.table.title(tableLabel)}
      closeLabel={t.guest.close}
      header={
        <div className="px-5 pt-8 pb-1">
          <h2 className="text-[22px] font-semibold text-slate">{t.table.title(tableLabel)}</h2>
          {session && !ended ? <p className="text-[14px] text-[#7c8285]">{t.table.opened(clockTime(session.openedAt, lang, restaurant.timezone))}</p> : null}
        </div>
      }
    >
      <div className="px-5 pb-8">
        {ended ? (
          <div className="py-6">
            <p className="text-[16px] text-slate">{t.table.ended}</p>
            <button type="button" className={buttonClass("brass", "md", "mt-5 rounded-[14px]")} onClick={onNewVisit}>
              {t.table.newVisit}
            </button>
          </div>
        ) : (
          <>
            {/* Service: a waiter, or the bill (with how they'll pay). */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!!busy || !!(waiter && !waiter.acknowledgedAt)}
                onClick={() => onAsk("waiter", null)}
                className={buttonClass("brass-outline", "lg", "h-auto min-h-14 flex-col gap-1 rounded-[16px] py-3 text-[15px] whitespace-normal")}
              >
                {busy === "waiter" ? <Spinner /> : <Icon.bell size={22} />}
                {t.table.callWaiter}
              </button>
              <button
                type="button"
                disabled={!!busy || orders.length === 0}
                onClick={() => setChoosingPay((v) => !v)}
                aria-expanded={choosingPay}
                className={buttonClass("brass-outline", "lg", cn("h-auto min-h-14 flex-col gap-1 rounded-[16px] py-3 text-[15px] whitespace-normal", choosingPay && "border-brass bg-brass-soft"))}
              >
                {busy === "bill" ? <Spinner /> : <Icon.receipt size={22} />}
                {t.table.askBill}
              </button>
            </div>
            {choosingPay ? (
              <div className="mt-3 animate-rise rounded-[16px] bg-stone p-4">
                <p className="text-[15px] font-medium text-slate">{t.table.payBy}</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {(["card", "cash"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={buttonClass("brass-outline", "md", "h-12 rounded-[12px] bg-white")}
                      onClick={() => {
                        setChoosingPay(false);
                        onAsk("bill", p);
                      }}
                    >
                      {p === "card" ? <Icon.card size={19} /> : <Icon.cash size={19} />}
                      {payLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {waiter || billReq ? (
              <ul className="mt-3 grid gap-2" aria-live="polite">
                {[waiter, billReq].filter(Boolean).map((r) => (
                  <li key={r!.id} className={cn("flex items-center gap-3 rounded-[14px] px-4 py-3 text-[14.5px]", r!.acknowledgedAt ? "bg-[#e7f2ea] text-[#285c3a]" : "bg-brass-soft text-brass-deep")}>
                    {r!.acknowledgedAt ? <Icon.check size={18} /> : <span className="size-2 animate-pulse rounded-full bg-brass" aria-hidden />}
                    <span className="flex-1">
                      {r!.kind === "waiter" ? t.table.waiterAsked : t.table.billAsked(payLabel(r!.payment))} {r!.acknowledgedAt ? t.table.onTheWay : null}
                    </span>
                    {!r!.acknowledgedAt ? <span className="text-[13px] opacity-75 tnum">{waited(now - new Date(r!.createdAt).getTime(), lang)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {orders.length === 0 ? (
              <p className="mt-8 text-[15px] text-[#5f6669]">{t.table.nothing}</p>
            ) : (
              <>
                <ol className="mt-6 grid gap-3">
                  {[...orders].reverse().map((o) => (
                    <OrderCard key={o.id} o={o} lang={lang} restaurant={restaurant} />
                  ))}
                </ol>
                <div className="mt-6 rounded-[16px] bg-stone p-4">
                  <h3 className="mb-3 text-[16px] font-semibold text-slate">{t.table.bill}</h3>
                  <BillRows subtotal={subtotal} r={restaurant} lang={lang} />
                </div>
              </>
            )}
            <button type="button" onClick={onClose} className={buttonClass("brass", "lg", "mt-6 h-13 w-full rounded-[14px]")}>
              {t.table.addMore}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

function OrderCard({ o, lang, restaurant }: { o: Ticket; lang: Lang; restaurant: RestaurantInfo }) {
  const t = dict(lang);
  const at = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  return (
    <li className="rounded-[16px] border border-black/[0.07] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[16px] font-semibold text-slate">{t.table.order(o.number)}</p>
        <p className="flex gap-3 text-[13px] text-[#7c8285]">
          <span>{t.table.round(o.round)}</span>
          <span className="tnum">{clockTime(o.createdAt, lang, restaurant.timezone)}</span>
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label={t.table.steps[o.status === "cancelled" ? "new" : o.status]}>
        {STEPS.map((st, i) => (
          <li key={st} className="min-w-0">
            <span className={cn("block h-1.5 rounded-full transition-colors duration-500", i <= at ? "bg-brass" : "bg-black/[0.08]", i === at && o.status !== "served" && "animate-pulse")} />
            <span className={cn("mt-1.5 block truncate text-[12.5px]", i === at ? "font-medium text-slate" : "text-[#8d9396]")}>{t.table.steps[st]}</span>
          </li>
        ))}
      </ol>
      <ul className="mt-3 space-y-1 text-[14.5px] text-[#4a5154]">
        {o.lines.map((l) => (
          <li key={l.id} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="tnum">{l.qty}×</span> {pick(lang, l.nameAr, l.nameEn)}
              {l.options.length ? <span className="text-[#8d9396]"> ({l.options.map((x) => pick(lang, x.nameAr, x.nameEn)).join(lang === "ar" ? "، " : ", ")})</span> : null}
            </span>
            <span className="shrink-0 tnum">{money(l.unitPrice * l.qty, restaurant.currency, lang)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
