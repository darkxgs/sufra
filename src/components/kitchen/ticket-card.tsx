"use client";

import { useEffect, useRef } from "react";
import { dict, pick } from "@/lib/i18n";
import { project, rubberband, spring, SPRINGS, VelocityTracker, type SpringHandle } from "@/lib/spring";
import { ageTone, allDone, clock, linesFor } from "@/lib/tickets";
import type { Lang, OrderStatus, Ticket } from "@/lib/types";
import { cn, Icon } from "../ui";

type Column = "new" | "preparing" | "ready";

const NEXT: Record<Column, OrderStatus> = { new: "preparing", preparing: "ready", ready: "served" };

/**
 * One kitchen ticket. Tap the button to move it on, tap a dish to tick it off,
 * or slide the whole ticket toward the next column: the slide commits when the
 * flick would carry it past halfway, and springs back otherwise.
 */
export function TicketCard({
  ticket,
  column,
  station,
  stationName,
  lang,
  now,
  warnMin,
  lateMin,
  fresh,
  busy,
  onMove,
  onMark,
}: {
  ticket: Ticket;
  column: Column;
  station: string;
  stationName: (key: string) => string;
  lang: Lang;
  now: number;
  warnMin: number;
  lateMin: number;
  fresh: boolean;
  busy: boolean;
  onMove: (t: Ticket, to: OrderStatus) => void;
  onMark: (t: Ticket, lineIds: string[], done: boolean) => void;
}) {
  const t = dict(lang);
  const lines = linesFor(ticket, station);
  const others = ticket.lines.length - lines.length;
  const age = now - new Date(ticket.createdAt).getTime();
  const tone = column === "ready" ? "ok" : ageTone(age, warnMin, lateMin);
  const stationView = station !== "all";
  const waitingOthers = stationView && column === "ready" && ticket.status !== "ready";

  // What the main button (and a slide) does here.
  let label: string | null = null;
  let act: (() => void) | null = null;
  if (stationView && column === "preparing") {
    // A station finishes its own dishes; the last station to finish makes the ticket ready.
    const open = lines.filter((l) => !l.done).map((l) => l.id);
    label = t.kitchen.stationDone(stationName(station));
    act = () => onMark(ticket, open, true);
  } else if (!waitingOthers) {
    label = column === "new" ? t.kitchen.start : column === "preparing" ? t.kitchen.ready : t.kitchen.served;
    act = () => onMove(ticket, NEXT[column]);
  }

  const card = useRef<HTMLDivElement>(null);
  const under = useRef<HTMLDivElement>(null);
  const x = useRef(0);
  const anim = useRef<SpringHandle | null>(null);
  const gesture = useRef<{ id: number; x0: number; y0: number; swiping: boolean; tracker: VelocityTracker } | null>(null);
  const suppressClick = useRef(false);
  const dir = lang === "ar" ? -1 : 1; // "forward" is toward the next column

  const paint = (v: number) => {
    x.current = v;
    if (card.current) card.current.style.transform = v ? `translate3d(${v}px,0,0) rotate(${v * 0.012}deg)` : "";
    if (under.current) under.current.style.opacity = String(Math.min(1, Math.max(0, (v * dir) / 90)));
  };
  useEffect(() => () => anim.current?.stop(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!act || busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    anim.current?.stop();
    const tracker = new VelocityTracker();
    tracker.add(e.clientX, e.clientY);
    gesture.current = { id: e.pointerId, x0: e.clientX - x.current, y0: e.clientY, swiping: false, tracker };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    g.tracker.add(e.clientX, e.clientY);
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.swiping) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        if (Math.abs(dy) > 10) gesture.current = null; // a scroll, not a swipe
        return;
      }
      g.swiping = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const forward = dx * dir;
    const w = card.current?.offsetWidth ?? 300;
    paint(forward >= 0 ? dx : dir * -rubberband(-forward, w, 0.4));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId || !g.swiping) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    const w = card.current?.offsetWidth ?? 300;
    const v = g.tracker.get().x;
    const heading = (x.current + project(v)) * dir;
    if (heading > w * 0.5 && act) {
      const run = act;
      anim.current = spring({ from: x.current, to: dir * (w + 60), velocity: v, config: SPRINGS.snappy, onUpdate: paint, onDone: () => run() });
    } else {
      anim.current = spring({ from: x.current, to: 0, velocity: v, config: SPRINGS.sheet, onUpdate: paint });
    }
  };

  return (
    <article className={cn("relative animate-rise", busy && "opacity-60")} aria-label={`${t.kitchen.tableShort(ticket.tableLabel)} #${ticket.number}`}>
      {act ? (
        <div ref={under} className="absolute inset-0 flex items-center justify-end rounded-[14px] bg-k-ready/20 px-6 text-[15px] font-medium text-k-ready opacity-0 rtl:justify-start" aria-hidden>
          {label}
        </div>
      ) : null}
      <div
        ref={card}
        className="relative touch-pan-y overflow-hidden rounded-[14px] bg-steel-2 ring-1 ring-steel-3 will-change-transform select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <header
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 transition-colors duration-500",
            tone === "late" ? "bg-k-late text-steel" : tone === "warn" ? "bg-k-new text-steel" : "bg-steel-3 text-chalk",
            fresh && "animate-flash",
          )}
        >
          <span className="text-[28px] leading-none font-semibold tracking-tight tnum">{t.kitchen.tableShort(ticket.tableLabel)}</span>
          <span className="flex flex-col text-[12.5px] leading-tight opacity-80">
            <span className="tnum">#{ticket.number}</span>
            {ticket.round > 1 ? <span>{t.kitchen.round(ticket.round)}</span> : null}
          </span>
          <span className="ms-auto flex items-center gap-1.5 text-[16px] font-medium tnum" title={new Date(ticket.createdAt).toLocaleTimeString()}>
            <Icon.clock size={16} />
            {clock(column === "ready" && ticket.readyAt ? new Date(ticket.readyAt).getTime() - new Date(ticket.createdAt).getTime() : age)}
          </span>
        </header>
        <ul className="divide-y divide-steel-3/70">
          {lines.map((l) => {
            const canTick = column !== "ready" || l.done;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={!canTick || busy || ticket.status === "ready" || ticket.status === "served"}
                  onClick={() => onMark(ticket, [l.id], !l.done)}
                  className={cn("flex w-full items-start gap-3 px-4 py-2.5 text-start transition-colors enabled:hover:bg-steel-3/40", l.done && "opacity-45")}
                >
                  <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-[7px] border text-[14px] font-semibold tnum", l.done ? "border-k-ready bg-k-ready text-steel" : "border-steel-4 text-chalk")}>
                    {l.done ? <Icon.check size={15} strokeWidth={2.6} /> : l.qty}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[16.5px] leading-snug", l.done && "line-through decoration-chalk-2/70")}>
                      {l.done && l.qty > 1 ? <span className="tnum">{l.qty}× </span> : null}
                      {pick(lang, l.nameAr, l.nameEn)}
                    </span>
                    {l.options.length ? <span className="mt-0.5 block text-[14px] text-chalk-2">{l.options.map((o) => pick(lang, o.nameAr, o.nameEn)).join(lang === "ar" ? "، " : ", ")}</span> : null}
                    {l.note ? <span className="mt-1.5 inline-block rounded-[6px] bg-k-new/15 px-2 py-0.5 text-[14px] font-medium text-k-new">{l.note}</span> : null}
                  </span>
                  {station === "all" && l.stationKey ? <span className="mt-1 shrink-0 text-[12px] text-chalk-2/80">{stationName(l.stationKey)}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {others > 0 ? <p className="px-4 pb-2 text-[12.5px] text-chalk-2/70">{t.kitchen.other(others)}</p> : null}
        <footer className="border-t border-steel-3 p-2.5">
          {label && act ? (
            <button
              type="button"
              disabled={busy}
              onClick={act}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-[16px] font-medium transition-[transform,background-color] active:scale-[0.98]",
                column === "new" ? "bg-steel-3 text-chalk hover:bg-steel-4" : column === "preparing" ? "bg-k-ready text-steel hover:brightness-105" : "bg-chalk text-steel hover:brightness-95",
              )}
            >
              {label}
            </button>
          ) : (
            <p className="py-2.5 text-center text-[14px] text-chalk-2">{allDone(lines) ? t.kitchen.columns.ready : ""}</p>
          )}
        </footer>
      </div>
    </article>
  );
}
