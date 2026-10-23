"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { askService, sendOrder } from "@/app/[lang]/t/[token]/actions";
import { dict, pick } from "@/lib/i18n";
import { money } from "@/lib/money";
import { lineKey, unitPrice } from "@/lib/selection";
import type { CartLine, GuestSnapshot, Lang, Menu, MenuItem, Payment } from "@/lib/types";
import { cn, Icon } from "../ui";
import { useLive, useNow } from "../use-live";
import { CartSheet, type CartState } from "./cart-sheet";
import { ItemSheet } from "./item-sheet";
import { MenuView } from "./menu-view";
import { useStoredState } from "./stored";
import { TableSheet } from "./table-sheet";

const newKey = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, "");

/**
 * A guest at a table: browse, build an order, send it, follow it. The cart and
 * which visit this phone belongs to are kept on the phone; the table's orders
 * come from the server every few seconds.
 */
export function GuestApp({ lang, menu, token, tableLabel, initial, langHref }: { lang: Lang; menu: Menu; token: string; tableLabel: string; initial: GuestSnapshot; langHref: string }) {
  const t = dict(lang);
  const r = menu.restaurant;
  const live = useLive<GuestSnapshot>(`/api/live/guest/${token}`, initial, 2500);
  const now = useNow(15_000) + live.offset;
  const unavailable = useMemo(() => new Set(live.data.unavailable), [live.data.unavailable]);
  const items = useMemo(() => new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const))), [menu]);

  const [cart, setCart] = useStoredState<CartLine[]>(`sufra:cart:${token}`, []);
  const [visit, setVisit] = useStoredState<string | null>(`sufra:visit:${token}`, null);
  const lines = useMemo(() => cart.filter((l) => items.has(l.itemId)), [cart, items]);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + unitPrice(items.get(l.itemId)!, l.optionIds) * l.qty, 0);
  const inCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty);
    return m;
  }, [lines]);

  // Which visit this phone belongs to. A phone that last saw a visit that has
  // since been closed doesn't silently show the next party's orders.
  const session = live.data.session;
  const ended = visit != null && session?.id !== visit;
  useEffect(() => {
    if (visit == null && session) setVisit(session.id);
  }, [visit, session, setVisit]);
  const mine = session && !ended ? session : null;

  const [sheet, setSheet] = useState<{ item: MenuItem | null; editing: CartLine | null; open: boolean }>({ item: null, editing: null, open: false });
  const [cartOpen, setCartOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [cartState, setCartState] = useState<CartState>({ phase: "editing" });
  const [sending, setSending] = useState(false);
  const [asking, setAsking] = useState<"waiter" | "bill" | null>(null);
  const idem = useRef<{ key: string; cart: string } | null>(null);

  const saveLine = (line: { itemId: string; qty: number; optionIds: string[]; note: string }, replaceKey: string | null) => {
    const key = lineKey(line.itemId, line.optionIds, line.note);
    setCart((prev) => {
      const rest = replaceKey ? prev.filter((l) => l.key !== replaceKey) : prev;
      const same = rest.find((l) => l.key === key);
      if (same) return rest.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + line.qty) } : l));
      return [...rest, { key, ...line }];
    });
    setCartState({ phase: "editing" });
    setSheet((s) => ({ ...s, open: false }));
    if (replaceKey) setCartOpen(true);
  };

  const send = async () => {
    if (!lines.length || sending) return;
    // One key per version of the cart: a retry of the same cart can't order twice.
    const snapshot = JSON.stringify(lines);
    if (!idem.current || idem.current.cart !== snapshot) idem.current = { key: newKey(), cart: snapshot };
    setSending(true);
    try {
      const res = await sendOrder(
        token,
        idem.current.key,
        lines.map((l) => ({ itemId: l.itemId, qty: l.qty, optionIds: l.optionIds, note: l.note })),
      );
      if (res.ok) {
        setVisit(res.sessionId);
        setCart([]);
        idem.current = null;
        setCartState({ phase: "sent", number: res.number });
        live.refresh();
      } else if (res.error === "unavailable") {
        const names = (res.itemIds ?? []).map((id) => items.get(id)).filter(Boolean).map((i) => pick(lang, i!.nameAr, i!.nameEn));
        setCartState({ phase: "error", message: t.cart.soldOut(names.join(lang === "ar" ? "، " : ", ")), badItems: res.itemIds });
        live.refresh();
      } else if (res.error === "too_many") {
        setCartState({ phase: "error", message: t.cart.tooMany });
      } else {
        setCartState({ phase: "error", message: t.cart.invalid });
      }
    } catch {
      setCartState({ phase: "error", message: t.cart.failed });
    } finally {
      setSending(false);
    }
  };

  const ask = async (kind: "waiter" | "bill", payment: Payment | null) => {
    setAsking(kind);
    try {
      const res = await askService(token, kind, payment);
      if (res.ok) {
        setVisit(res.sessionId);
        live.refresh();
      }
    } finally {
      setAsking(null);
    }
  };

  const status = mine?.orders.length ? mine.orders[mine.orders.length - 1].status : null;
  const readyNow = mine?.orders.some((o) => o.status === "ready");
  const openItem = sheet.item;

  return (
    <>
      <MenuView
        menu={menu}
        lang={lang}
        tableLabel={tableLabel}
        unavailable={unavailable}
        inCart={inCart}
        langHref={langHref}
        onOpen={(item) => setSheet({ item, editing: null, open: true })}
        actions={
          <button
            type="button"
            onClick={() => setTableOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[14px] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <Icon.bell size={16} />
            {t.guest.service}
          </button>
        }
      />

      {/* The dock: the table's orders, and the cart. */}
      {mine?.orders.length || count ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-[616px] gap-2">
            {mine?.orders.length ? (
              <button
                type="button"
                onClick={() => setTableOpen(true)}
                className={cn(
                  "flex h-14 items-center gap-2.5 rounded-[18px] border border-black/[0.06] bg-white px-4 text-[15px] font-medium text-slate shadow-[0_8px_30px_rgb(0_0_0/0.14)] transition active:scale-[0.98]",
                  !count && "flex-1 justify-center",
                )}
              >
                <span className="relative grid size-6 place-items-center">
                  <Icon.table size={20} />
                  <span className={cn("absolute -end-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white", readyNow ? "bg-[#2f8f57]" : status === "served" ? "bg-[#b9bec0]" : "animate-pulse bg-brass")} aria-hidden />
                </span>
                {t.guest.yourTable}
              </button>
            ) : null}
            {count ? (
              <button
                type="button"
                onClick={() => {
                  setCartState((s) => (s.phase === "sent" ? { phase: "editing" } : s));
                  setCartOpen(true);
                }}
                className="flex h-14 flex-1 items-center justify-between gap-3 rounded-[18px] bg-brass px-5 text-[16px] font-medium text-white shadow-[0_10px_30px_rgb(110_72_24/0.35)] transition active:scale-[0.98]"
              >
                <span className="flex items-center gap-2.5">
                  <span key={count} className="grid h-7 min-w-7 animate-pop place-items-center rounded-full bg-white/20 px-1.5 text-[14px] tnum">
                    {count}
                  </span>
                  {t.guest.viewOrder}
                </span>
                <span className="tnum">{money(total, r.currency, lang)}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ItemSheet
        item={openItem}
        editing={sheet.editing}
        open={sheet.open}
        lang={lang}
        currency={r.currency}
        showCalories={r.showCalories}
        soldOut={openItem ? unavailable.has(openItem.id) || !openItem.available : false}
        browseOnly={false}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={saveLine}
      />
      <CartSheet
        open={cartOpen}
        onClose={() => {
          setCartOpen(false);
          if (cartState.phase === "sent") setCartState({ phase: "editing" });
        }}
        lang={lang}
        restaurant={r}
        lines={lines}
        items={items}
        state={cartState}
        sending={sending}
        onQty={(key, qty) => setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty } : l)))}
        onRemove={(key) => {
          setCart((prev) => prev.filter((l) => l.key !== key));
          setCartState({ phase: "editing" });
        }}
        onEdit={(line) => {
          setCartOpen(false);
          setSheet({ item: items.get(line.itemId) ?? null, editing: line, open: true });
        }}
        onSend={send}
        onFollow={() => {
          setCartOpen(false);
          setCartState({ phase: "editing" });
          setTableOpen(true);
        }}
      />
      <TableSheet
        open={tableOpen}
        onClose={() => setTableOpen(false)}
        lang={lang}
        restaurant={r}
        tableLabel={tableLabel}
        session={mine}
        ended={ended}
        now={now}
        busy={asking}
        onAsk={ask}
        onNewVisit={() => {
          setVisit(session?.id ?? null);
          setTableOpen(false);
        }}
      />
    </>
  );
}
