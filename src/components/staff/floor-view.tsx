"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { acknowledgeAction, closeTableAction, moveTicketAction } from "@/app/[lang]/staff/actions";
import { clockTime, waited } from "@/lib/format";
import { dict, pick } from "@/lib/i18n";
import { money } from "@/lib/money";
import { tableState, type TableState } from "@/lib/tickets";
import type { FloorTable, Lang, RestaurantInfo, ServiceRequest, StaffSnapshot, Ticket } from "@/lib/types";
import { BillRows } from "../guest/cart-sheet";
import { Sheet } from "../sheet";
import { buttonClass, cn, Icon, Spinner } from "../ui";
import { useLive, useNow } from "../use-live";

const TONE: Record<TableState, string> = {
  free: "border-rule bg-paper text-muted",
  seated: "border-zaatar/25 bg-zaatar-soft/70 text-zaatar-deep",
  waiting: "border-sky/35 bg-sky-soft text-[#1d5a8f]",
  ready: "border-mint/40 bg-mint-soft text-[#145c3a]",
  attention: "border-saffron/50 bg-saffron-soft text-[#7a5410]",
  bill: "border-saffron/60 bg-saffron-soft text-[#7a5410]",
};

const span = (shape: FloorTable["shape"]) => (shape === "long" ? 4 : 2);

type Attention = { at: number; kind: "request"; req: ServiceRequest } | { at: number; kind: "ready"; ticket: Ticket };

export function FloorView({ lang, restaurant, initial }: { lang: Lang; restaurant: RestaurantInfo; initial: StaffSnapshot }) {
  const t = dict(lang);
  const live = useLive<StaffSnapshot>("/api/live/staff", initial, 2000);
  const now = useNow(15_000) + live.offset;
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const tables = live.data.tables;
  const open = tables.find((x) => x.id === openId) ?? null;
  const m = (n: number) => money(n, restaurant.currency, lang);

  const attention = useMemo<Attention[]>(() => {
    const list: Attention[] = live.data.requests.map((req) => ({ at: new Date(req.createdAt).getTime(), kind: "request" as const, req }));
    for (const tk of live.data.tickets) if (tk.status === "ready") list.push({ at: new Date(tk.readyAt ?? tk.createdAt).getTime(), kind: "ready", ticket: tk });
    return list.sort((a, b) => a.at - b.at);
  }, [live.data]);

  const run = async (key: string, fn: () => Promise<{ snapshot: StaffSnapshot }>) => {
    setBusy(key);
    try {
      live.setData((await fn()).snapshot);
    } finally {
      setBusy(null);
    }
  };

  const rows = Math.max(...tables.map((x) => x.y + 2), 4);
  const terraceRow = tables.filter((x) => x.areaEn === "Terrace").reduce((min, x) => Math.min(min, x.y), Infinity);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label={t.floor.title} className="order-2 lg:order-1">
        <div className="rounded-[20px] border border-rule bg-paper p-4 sm:p-6">
          <div className="grid gap-2.5 sm:gap-3.5" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gridTemplateRows: `repeat(${rows}, minmax(34px, auto))` }}>
            {Number.isFinite(terraceRow) ? (
              <div className="flex items-end gap-3 pb-1 text-[13px] text-muted" style={{ gridColumn: "1 / -1", gridRow: `${terraceRow} / span 1` }}>
                <span>{lang === "ar" ? "التراس" : "Terrace"}</span>
                <span className="mb-2 h-px flex-1 bg-rule" />
              </div>
            ) : null}
            {tables.map((x) => {
              const state = tableState(x.session);
              const req = x.session?.requests[0];
              const since = req ? req.createdAt : x.session?.openedAt;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    setOpenId(x.id);
                    setConfirming(false);
                  }}
                  className={cn(
                    "relative flex min-h-[86px] flex-col items-center justify-center gap-0.5 border-[1.5px] px-1 text-center transition-[transform,box-shadow] duration-150 hover:shadow-[0_6px_18px_-8px_rgb(20_30_25/0.35)] active:scale-[0.98]",
                    x.shape === "round" ? "rounded-full" : "rounded-[16px]",
                    TONE[state],
                  )}
                  style={{ gridColumn: `${x.x + 1} / span ${span(x.shape)}`, gridRow: `${x.y + 1} / span 2` }}
                  aria-label={`${t.guest.table(x.label)}: ${t.floor.states[state]}`}
                >
                  <span className="text-[24px] leading-none font-semibold tnum">{x.label}</span>
                  {/* On a phone the colour and the legend carry the state; the label stays readable. */}
                  <span className="hidden text-[12px] opacity-80 sm:block">{state === "free" ? t.floor.seats(x.seats) : t.floor.states[state]}</span>
                  {since && state !== "free" ? <span className="hidden text-[11.5px] opacity-70 tnum sm:block">{waited(now - new Date(since).getTime(), lang)}</span> : null}
                  {req ? (
                    <span className="absolute -end-1.5 -top-1.5 grid size-7 place-items-center rounded-full bg-saffron text-white shadow" aria-hidden>
                      {req.kind === "bill" ? <Icon.receipt size={15} /> : <Icon.bell size={15} />}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule-2 pt-4 text-[13px] text-muted">
            {(["free", "seated", "waiting", "ready", "bill"] as TableState[]).map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className={cn("size-3.5 rounded-[4px] border-[1.5px]", TONE[s])} aria-hidden />
                {t.floor.states[s]}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <aside className="order-1 lg:order-2" aria-labelledby="attention">
        <h2 id="attention" className="mb-3 text-[16px] font-semibold">
          {t.floor.attention}
        </h2>
        {notice ? (
          <p role="status" className="mb-3 rounded-[12px] bg-mint-soft px-3.5 py-2.5 text-[14px] text-[#145c3a]">
            {notice}
          </p>
        ) : null}
        {attention.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-rule px-4 py-8 text-center text-[14.5px] text-muted">{t.floor.nothing}</p>
        ) : (
          <ul className="grid gap-2.5">
            {attention.map((a) =>
              a.kind === "request" ? (
                <li key={a.req.id} className="flex items-center gap-3 rounded-[14px] border border-saffron/40 bg-saffron-soft/60 p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-saffron text-white">{a.req.kind === "bill" ? <Icon.receipt size={19} /> : <Icon.bell size={19} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{t.guest.table(a.req.tableLabel)}</span>
                    <span className="block text-[13.5px] text-ink-2">
                      {a.req.kind === "waiter" ? t.floor.waiter : a.req.payment ? t.floor.bill(a.req.payment === "card" ? t.table.card : t.table.cash) : t.floor.billNoPay}
                      <span className="ms-2 whitespace-nowrap text-muted tnum">{waited(now - a.at, lang)}</span>
                    </span>
                  </span>
                  <button type="button" disabled={busy === a.req.id} onClick={() => run(a.req.id, () => acknowledgeAction(a.req.id))} className={buttonClass("outline", "sm", "shrink-0")}>
                    {busy === a.req.id ? <Spinner /> : null}
                    {t.floor.ack}
                  </button>
                </li>
              ) : (
                <li key={a.ticket.id} className="flex items-center gap-3 rounded-[14px] border border-mint/35 bg-mint-soft/60 p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-white">
                    <Icon.check size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{t.guest.table(a.ticket.tableLabel)}</span>
                    <span className="block text-[13.5px] text-ink-2">
                      {t.floor.readyToServe(a.ticket.number)}
                      <span className="ms-2 whitespace-nowrap text-muted tnum">{waited(now - a.at, lang)}</span>
                    </span>
                  </span>
                  <button type="button" disabled={busy === a.ticket.id} onClick={() => run(a.ticket.id, () => moveTicketAction(a.ticket.id, "ready", "served"))} className={buttonClass("outline", "sm", "shrink-0")}>
                    {busy === a.ticket.id ? <Spinner /> : null}
                    {t.floor.serve}
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </aside>

      <Sheet open={!!open} onClose={() => setOpenId(null)} label={open ? t.guest.table(open.label) : ""} closeLabel={t.guest.close} header={open ? <TableHeader table={open} lang={lang} restaurant={restaurant} /> : undefined}>
        {open ? (
          <div className="px-5 pb-8">
            {open.session ? (
              <>
                {open.session.requests.length ? (
                  <ul className="mt-2 grid gap-2">
                    {open.session.requests.map((req) => (
                      <li key={req.id} className="flex items-center gap-3 rounded-[12px] bg-saffron-soft px-3.5 py-2.5 text-[14.5px] text-[#7a5410]">
                        {req.kind === "bill" ? <Icon.receipt size={18} /> : <Icon.bell size={18} />}
                        <span className="flex-1">{req.kind === "waiter" ? t.floor.waiter : req.payment ? t.floor.bill(req.payment === "card" ? t.table.card : t.table.cash) : t.floor.billNoPay}</span>
                        <button type="button" disabled={busy === req.id} onClick={() => run(req.id, () => acknowledgeAction(req.id))} className={buttonClass("outline", "sm")}>
                          {t.floor.ack}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ol className="mt-4 grid gap-2.5">
                  {open.session.orders.map((o) => (
                    <li key={o.id} className="rounded-[14px] border border-rule p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[15px] font-semibold">{t.table.order(o.number)}</span>
                        <span className="flex items-center gap-2">
                          <span className={cn("rounded-full px-2.5 py-0.5 text-[12.5px] font-medium", o.status === "ready" ? "bg-mint-soft text-[#145c3a]" : o.status === "served" ? "bg-rule-2 text-muted" : "bg-sky-soft text-[#1d5a8f]")}>
                            {o.status === "cancelled" ? "–" : t.table.steps[o.status]}
                          </span>
                          {o.status === "ready" ? (
                            <button type="button" disabled={busy === o.id} onClick={() => run(o.id, () => moveTicketAction(o.id, "ready", "served"))} className={buttonClass("outline", "sm", "h-8")}>
                              {t.floor.serve}
                            </button>
                          ) : null}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-[14px] text-ink-2">
                        {o.lines.map((l) => (
                          <li key={l.id} className="flex justify-between gap-3">
                            <span>
                              <span className="tnum">{l.qty}×</span> {pick(lang, l.nameAr, l.nameEn)}
                            </span>
                            <span className="tnum">{m(l.unitPrice * l.qty)}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 rounded-[14px] bg-well p-4">
                  <BillRows subtotal={open.session.subtotal} r={restaurant} lang={lang} />
                </div>
                {confirming ? (
                  <div className="mt-4 rounded-[14px] border border-pom/30 bg-pom-soft/60 p-4">
                    <p className="text-[14.5px] leading-relaxed text-[#7d2622]">{t.floor.closeLive(open.session.orders.filter((o) => o.status === "new" || o.status === "preparing").length)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={busy === open.session.id} className={buttonClass("danger", "lg", "h-11")} onClick={() => closeTable(open.session!.id, open.label)}>
                        {busy === open.session.id ? <Spinner /> : null}
                        {t.floor.confirmClose}
                      </button>
                      <button type="button" className={buttonClass("outline", "md")} onClick={() => setConfirming(false)}>
                        {t.floor.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    {open.session.orders.some((o) => o.status === "new" || o.status === "preparing") ? (
                      <button type="button" className={buttonClass("primary", "lg", "h-12 w-full")} onClick={() => setConfirming(true)}>
                        {t.floor.close}
                      </button>
                    ) : (
                      <button type="button" disabled={busy === open.session.id} className={buttonClass("primary", "lg", "h-12 w-full")} onClick={() => closeTable(open.session!.id, open.label)}>
                        {busy === open.session.id ? <Spinner /> : null}
                        {t.floor.close}
                      </button>
                    )}
                    <p className="mt-2 text-center text-[13px] text-muted">{t.floor.closeHint}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="py-6 text-[15px] text-muted">{t.floor.free}</p>
            )}
            <Link href={`/${lang}/t/${open.token}`} target="_blank" className="mt-5 inline-block text-[14px] text-zaatar underline-offset-4 hover:underline">
              {t.floor.openMenu}
            </Link>
          </div>
        ) : null}
      </Sheet>
    </div>
  );

  async function closeTable(sessionId: string, label: string) {
    setBusy(sessionId);
    try {
      const res = await closeTableAction(sessionId);
      live.setData(res.snapshot);
      setOpenId(null);
      setConfirming(false);
      if (res.ok && res.total != null) {
        setNotice(t.floor.closed(label, m(res.total)));
        window.setTimeout(() => setNotice(null), 6000);
      }
    } finally {
      setBusy(null);
    }
  }
}

function TableHeader({ table, lang, restaurant }: { table: FloorTable; lang: Lang; restaurant: RestaurantInfo }) {
  const t = dict(lang);
  const state = tableState(table.session);
  return (
    <div className="px-5 pt-8 pb-2">
      <h2 className="text-[22px] font-semibold">{t.guest.table(table.label)}</h2>
      <p className="text-[14px] text-muted">
        {t.floor.states[state]}
        {table.session ? <span className="ms-3 tnum">{t.table.opened(clockTime(table.session.openedAt, lang, restaurant.timezone))}</span> : null}
      </p>
    </div>
  );
}
