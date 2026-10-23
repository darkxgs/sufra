"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markLinesAction, moveTicketAction, simulationAction, type BoardResult } from "@/app/[lang]/staff/actions";
import { dict, pick } from "@/lib/i18n";
import { allDone, linesFor } from "@/lib/tickets";
import type { Lang, OrderStatus, RestaurantInfo, StaffSnapshot, Station, Ticket } from "@/lib/types";
import { Mark } from "../brand";
import { useStoredState } from "../guest/stored";
import { cn, Icon, Switch } from "../ui";
import { useLive, useNow } from "../use-live";
import { TicketCard } from "./ticket-card";

type Column = "new" | "preparing" | "ready";
const COLUMNS: Column[] = ["new", "preparing", "ready"];
type Toast = { id: number; text: string; undo?: () => void };

/** Where a ticket sits for one station: its own dishes decide, not the whole ticket. */
function columnFor(t: Ticket, station: string): Column | null {
  if (station === "all") return t.status === "served" || t.status === "cancelled" ? null : (t.status as Column);
  const mine = linesFor(t, station);
  if (!mine.length || t.status === "served" || t.status === "cancelled") return null;
  if (allDone(mine)) return "ready";
  return t.status === "new" ? "new" : "preparing";
}

function chime(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  [988, 1319].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const at = t0 + i * 0.15;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
    o.connect(g).connect(ctx.destination);
    o.start(at);
    o.stop(at + 0.75);
  });
}

export function KitchenBoard({ lang, restaurant, stations, initial }: { lang: Lang; restaurant: RestaurantInfo; stations: Station[]; initial: StaffSnapshot }) {
  const t = dict(lang);
  const live = useLive<StaffSnapshot>("/api/live/staff", initial, 1500);
  const now = useNow(1000) + live.offset;
  const [station, setStation] = useStoredState<string>("sufra:station", "all");
  const [sound, setSound] = useStoredState<boolean>("sufra:sound", false);
  const [pending, setPending] = useState<Map<string, OrderStatus>>(new Map());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef(new Set(initial.tickets.map((x) => x.id)));
  const audio = useRef<AudioContext | null>(null);
  const toastId = useRef(0);
  const validStation = station === "all" || stations.some((s) => s.key === station) ? station : "all";

  const toast = useCallback((text: string, undo?: () => void) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-2), { id, text, undo }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 6000);
  }, []);

  // New tickets: chime (if on) and flash their header for a few seconds.
  useEffect(() => {
    const arrived = live.data.tickets.filter((x) => !seen.current.has(x.id));
    if (!arrived.length) return;
    arrived.forEach((x) => seen.current.add(x.id));
    const newOnes = arrived.filter((x) => x.status === "new").map((x) => x.id);
    if (!newOnes.length) return;
    if (sound && audio.current) chime(audio.current);
    setFresh((f) => new Set([...f, ...newOnes]));
    const timer = window.setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !newOnes.includes(id)))), 4000);
    return () => window.clearTimeout(timer);
  }, [live.data.tickets, sound]);

  function settle(id: string) {
    setPending((p) => {
      const n = new Map(p);
      n.delete(id);
      return n;
    });
  }

  function apply(res: BoardResult, id: string) {
    live.setData(res.snapshot);
    settle(id);
    if (!res.ok && res.error === "stale") toast(t.kitchen.stale);
  }

  async function move(ticket: Ticket, to: OrderStatus, withUndo = true) {
    const from = pending.get(ticket.id) ?? ticket.status;
    setPending((p) => new Map(p).set(ticket.id, to));
    try {
      const res = await moveTicketAction(ticket.id, from, to);
      apply(res, ticket.id);
      if (res.ok && withUndo) {
        const label = to === "served" ? t.kitchen.served : (t.kitchen.columns[to as Column] ?? to);
        toast(t.kitchen.moved(ticket.number, label), () => void move({ ...ticket, status: to }, from, false));
      }
    } catch {
      settle(ticket.id);
      toast(t.kitchen.offline);
    }
  }

  async function mark(ticket: Ticket, lineIds: string[], done: boolean) {
    // Optimistic: tick the lines now; the server's answer replaces this.
    live.setData({
      ...live.data,
      tickets: live.data.tickets.map((x) => (x.id === ticket.id ? { ...x, lines: x.lines.map((l) => (lineIds.includes(l.id) ? { ...l, done } : l)) } : x)),
    });
    try {
      apply(await markLinesAction(ticket.id, lineIds, done), ticket.id);
    } catch {
      toast(t.kitchen.offline);
      live.refresh();
    }
  }

  const tickets = useMemo(() => live.data.tickets.map((x) => (pending.has(x.id) ? { ...x, status: pending.get(x.id)! } : x)), [live.data.tickets, pending]);
  const columns = useMemo(() => {
    const out: Record<Column, Ticket[]> = { new: [], preparing: [], ready: [] };
    for (const x of tickets) {
      const c = columnFor(x, validStation);
      if (c) out[c].push(x);
    }
    for (const c of COLUMNS) out[c].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  }, [tickets, validStation]);

  const stationName = (key: string) => {
    const st = stations.find((x) => x.key === key);
    return st ? pick(lang, st.nameAr, st.nameEn) : key;
  };
  const time = new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: restaurant.timezone }).format(now);

  return (
    <div className="kitchen flex h-dvh flex-col bg-steel text-chalk">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-steel-3 px-4 py-2.5">
        <Link href={`/${lang}/staff`} className="flex items-center gap-2.5 rounded-control py-1 pe-2 text-chalk-2 transition-colors hover:text-chalk" aria-label={t.staff.nav.home}>
          <Mark className="size-6 text-k-ready" />
          <span className="text-[15px] font-medium text-chalk">{t.kitchen.title}</span>
        </Link>
        <div role="tablist" aria-label={t.kitchen.all} className="no-scrollbar order-last flex max-w-full gap-1 overflow-x-auto rounded-[12px] bg-steel-2 p-1 sm:order-none">
          {[{ key: "all", label: t.kitchen.all }, ...stations.map((s) => ({ key: s.key, label: pick(lang, s.nameAr, s.nameEn) }))].map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={validStation === s.key}
              type="button"
              onClick={() => setStation(s.key)}
              className={cn("h-9 shrink-0 rounded-[9px] px-3.5 text-[14px] whitespace-nowrap transition-colors", validStation === s.key ? "bg-steel-4 font-medium text-chalk" : "text-chalk-2 hover:text-chalk")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-2">
          {restaurant.isDemo ? (
            <label className="flex items-center gap-2 rounded-[10px] bg-steel-2 py-1.5 ps-3 pe-2 text-[13.5px] text-chalk-2" title={t.kitchen.simHint}>
              <Icon.flame size={16} />
              <span className="hidden sm:inline">{t.kitchen.sim}</span>
              <Switch
                tone="steel"
                label={t.kitchen.sim}
                checked={live.data.sim}
                onChange={async (on) => {
                  live.setData((await simulationAction(on)).snapshot);
                }}
              />
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!sound) {
                audio.current ??= new AudioContext();
                void audio.current.resume();
                chime(audio.current);
              }
              setSound(!sound);
            }}
            aria-pressed={sound}
            className="grid size-10 place-items-center rounded-[10px] bg-steel-2 text-chalk-2 transition-colors hover:text-chalk"
            aria-label={sound ? t.kitchen.soundOn : t.kitchen.soundOff}
            title={sound ? t.kitchen.soundOn : t.kitchen.soundOff}
          >
            {sound ? <Icon.volume size={19} /> : <Icon.mute size={19} />}
          </button>
          <button
            type="button"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
            className="hidden size-10 place-items-center rounded-[10px] bg-steel-2 text-chalk-2 transition-colors hover:text-chalk sm:grid"
            aria-label={t.kitchen.fullscreen}
            title={t.kitchen.fullscreen}
          >
            <Icon.expand size={18} />
          </button>
          <span className="ms-1 text-[22px] font-medium text-chalk tnum" aria-hidden>
            {time}
          </span>
        </div>
      </header>

      {live.offline ? <p className="shrink-0 bg-k-late/15 px-4 py-2 text-center text-[14px] text-k-late">{t.kitchen.offline}</p> : null}

      <main className="no-scrollbar grid min-h-0 flex-1 snap-x snap-mandatory auto-cols-[88%] grid-flow-col gap-3 overflow-x-auto p-3 sm:auto-cols-[minmax(320px,1fr)] lg:grid-flow-row lg:grid-cols-3 lg:overflow-hidden">
        {COLUMNS.map((c) => (
          <section key={c} className="flex min-h-0 snap-start flex-col rounded-[16px] bg-[#161c1e]" aria-label={t.kitchen.columns[c]}>
            <h2 className="flex shrink-0 items-center gap-2.5 px-4 pt-3.5 pb-2.5 text-[15px] font-medium">
              <span className={cn("size-2.5 rounded-full", c === "new" ? "bg-k-new" : c === "preparing" ? "bg-k-prep" : "bg-k-ready")} aria-hidden />
              {t.kitchen.columns[c]}
              <span className="ms-auto rounded-full bg-steel-3 px-2.5 py-0.5 text-[13px] text-chalk-2 tnum">{columns[c].length}</span>
            </h2>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
              {columns[c].length === 0 ? <p className="px-2 pt-6 text-center text-[14px] text-chalk-2/70">{t.kitchen.empty[c]}</p> : null}
              {columns[c].map((x) => (
                <TicketCard
                  key={`${x.id}:${c}`}
                  ticket={x}
                  column={c}
                  station={validStation}
                  stationName={stationName}
                  lang={lang}
                  now={now}
                  warnMin={restaurant.warnAfterMin}
                  lateMin={restaurant.lateAfterMin}
                  fresh={fresh.has(x.id)}
                  busy={pending.has(x.id)}
                  onMove={move}
                  onMark={mark}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className="pointer-events-auto flex animate-rise items-center gap-4 rounded-[14px] bg-chalk py-2.5 ps-4 pe-2.5 text-[14.5px] text-steel shadow-[0_12px_30px_rgb(0_0_0/0.4)]">
            <span>{x.text}</span>
            {x.undo ? (
              <button
                type="button"
                onClick={() => {
                  x.undo?.();
                  setToasts((ts) => ts.filter((y) => y.id !== x.id));
                }}
                className="flex h-9 items-center gap-1.5 rounded-[10px] bg-steel px-3 text-[14px] font-medium text-chalk"
              >
                <Icon.undo size={16} />
                {t.kitchen.undo}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
