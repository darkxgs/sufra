"use client";

import { useState } from "react";
import type { Lang } from "@/lib/types";
import { cn } from "../ui";

// One series each, so no legend: the heading names what's plotted. Bars are
// capped at 24 px with a 4 px rounded top, hover/focus shows the exact value,
// and the peak carries a direct label. A screen-reader table repeats the data.

const hourLabel = (h: number, lang: Lang) => {
  if (lang === "ar") return h === 0 ? "12 ص" : h < 12 ? `${h} ص` : h === 12 ? "12 م" : `${h - 12} م`;
  return h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
};

export function HourChart({ data, lang, currentHour, caption }: { data: { hour: number; orders: number }[]; lang: Lang; currentHour: number; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const first = Math.min(currentHour - 7, ...data.map((d) => d.hour));
  const hours = Array.from({ length: currentHour - Math.max(0, first) + 1 }, (_, i) => Math.max(0, first) + i);
  const value = (h: number) => data.find((d) => d.hour === h)?.orders ?? 0;
  const max = Math.max(1, ...hours.map(value));
  const top = Math.max(2, Math.ceil(max / 2) * 2);
  const peak = hours.reduce((a, h) => (value(h) > value(a) ? h : a), hours[0]);
  const H = 150;

  return (
    <figure>
      <div className="relative flex h-[190px] gap-1 border-b border-rule ps-8" role="img" aria-label={caption}>
        {/* y ticks */}
        <div className="pointer-events-none absolute inset-y-0 start-0 bottom-0 w-full" aria-hidden>
          {[top, top / 2, 0].map((v) => (
            <div key={v} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: (v / top) * H }}>
              <span className="w-6 text-end text-[11px] text-faint tnum">{v}</span>
              <span className="h-px flex-1 bg-rule-2" />
            </div>
          ))}
        </div>
        {hours.map((h) => {
          const v = value(h);
          const on = hover === h;
          return (
            <button
              key={h}
              type="button"
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end outline-none"
              onPointerEnter={() => setHover(h)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(h)}
              onBlur={() => setHover(null)}
              aria-label={`${hourLabel(h, lang)}: ${v}`}
            >
              {(on || (h === peak && hover == null)) && v > 0 ? (
                <span className="absolute z-10 rounded-[8px] bg-ink px-2 py-1 text-[12px] whitespace-nowrap text-white shadow" style={{ bottom: (v / top) * H + 8 }}>
                  <span className="font-semibold tnum">{v}</span> <span className="text-white/70">{hourLabel(h, lang)}</span>
                </span>
              ) : null}
              <span
                className={cn("w-full max-w-6 rounded-t-[4px] bg-chart transition-[filter] duration-150", on && "brightness-125", h === currentHour && "opacity-70")}
                style={{ height: v ? Math.max(3, (v / top) * H) : 0 }}
              />
              <span className="absolute -bottom-6 text-[11px] text-muted tnum">{h % 2 === currentHour % 2 ? hourLabel(h, lang) : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="h-7" />
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <th>{hourLabel(h, lang)}</th>
              <td>{value(h)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
