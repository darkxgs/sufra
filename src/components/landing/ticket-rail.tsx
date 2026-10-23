"use client";

import { useEffect, useRef, useState } from "react";
import { spring, SPRINGS, type SpringHandle } from "@/lib/spring";
import type { Lang } from "@/lib/types";
import { cn } from "../ui";

type Paper = { id: number; table: string; round: number; lines: [number, string][]; note?: string; tone: "new" | "preparing" | "ready" };

const AR: Omit<Paper, "id">[] = [
  { table: "4", round: 1, lines: [[1, "مشاوي مشكلة"], [2, "شاي كرك"]], note: "بدون بصل", tone: "new" },
  { table: "7", round: 2, lines: [[2, "كنافة نابلسية"], [1, "قهوة سعودية"]], tone: "preparing" },
  { table: "2", round: 1, lines: [[1, "شيش طاووق"], [1, "فتوش"], [3, "ليمون بالنعناع"]], tone: "ready" },
  { table: "9", round: 1, lines: [[4, "منقوشة زعتر"], [1, "حمص بالطحينة"]], note: "الصوص على الجنب", tone: "new" },
  { table: "6", round: 3, lines: [[1, "ريش غنم"], [1, "تبولة"]], tone: "preparing" },
];
const EN: Omit<Paper, "id">[] = [
  { table: "4", round: 1, lines: [[1, "Mixed grill for two"], [2, "Karak tea"]], note: "No onions", tone: "new" },
  { table: "7", round: 2, lines: [[2, "Kunafa nabulsiya"], [1, "Saudi coffee"]], tone: "preparing" },
  { table: "2", round: 1, lines: [[1, "Shish tawook"], [1, "Fattoush"], [3, "Lemon mint"]], tone: "ready" },
  { table: "9", round: 1, lines: [[4, "Za'atar manakish"], [1, "Hummus"]], note: "Sauce on the side", tone: "new" },
  { table: "6", round: 3, lines: [[1, "Lamb chops"], [1, "Tabbouleh"]], tone: "preparing" },
];

const W = 196; // ticket width + gap
const SHOWN = 3;

/**
 * Paper tickets clipped to a steel rail. Every few seconds a new order slides
 * in at the start of the rail, pushing the others along; each ticket swings
 * on its clip and settles, the way paper does when it's shoved.
 */
export function TicketRail({ lang, label }: { lang: Lang; label: string }) {
  const source = lang === "ar" ? AR : EN;
  const rtl = lang === "ar";
  const [papers, setPapers] = useState<Paper[]>(() => source.slice(0, SHOWN + 1).map((p, i) => ({ ...p, id: i })));
  const next = useRef(SHOWN + 1);
  const els = useRef(new Map<number, HTMLDivElement>());
  const state = useRef(new Map<number, { x: number; r: number; anims: SpringHandle[] }>());

  // Place (or move) every ticket to its slot; new ones come in from off the rail.
  useEffect(() => {
    papers.forEach((p, i) => {
      const el = els.current.get(p.id);
      if (!el) return;
      const dir = rtl ? -1 : 1;
      const target = (i - 1) * W * dir;
      let s = state.current.get(p.id);
      const fresh = !s;
      if (!s) {
        s = { x: target, r: 0, anims: [] };
        state.current.set(p.id, s);
      }
      const st = s;
      const paint = () => {
        el.style.transform = `translateX(${st.x}px) rotate(${st.r}deg)`;
      };
      st.anims.forEach((a) => a.stop());
      if (fresh && i === 0) {
        // The newcomer: arrives from the start of the rail with a swing.
        st.x = target - W * dir * 0.9;
        st.r = 12 * dir;
        paint();
        st.anims = [
          spring({ from: st.x, to: target, config: SPRINGS.sheet, onUpdate: (v) => ((st.x = v), paint()) }),
          spring({ from: st.r, to: 0, velocity: -40 * dir, config: { response: 0.9, damping: 0.32 }, onUpdate: (v) => ((st.r = v), paint()) }),
        ];
      } else if (Math.abs(st.x - target) > 0.5) {
        // Pushed along: a small sway as it slides.
        st.anims = [
          spring({ from: st.x, to: target, config: SPRINGS.sheet, onUpdate: (v) => ((st.x = v), paint()) }),
          spring({ from: st.r, to: 0, velocity: -55 * dir, config: { response: 0.8, damping: 0.35 }, onUpdate: (v) => ((st.r = v), paint()) }),
        ];
      } else {
        paint();
      }
    });
  }, [papers, rtl]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const id = next.current++;
      setPapers((prev) => {
        const incoming = { ...source[id % source.length], id };
        const kept = [incoming, ...prev].slice(0, SHOWN + 2);
        for (const old of prev) if (!kept.includes(old)) state.current.delete(old.id);
        return kept;
      });
    }, 3600);
    const anims = state.current;
    return () => {
      window.clearInterval(timer);
      anims.forEach((s) => s.anims.forEach((a) => a.stop()));
    };
  }, [source]);

  return (
    <div className="relative h-[330px] w-full overflow-hidden sm:h-[360px]" role="img" aria-label={label}>
      {/* The rail */}
      <div className="absolute inset-x-0 top-[34px] h-[14px] rounded-full bg-[linear-gradient(to_bottom,#e9eeec,#b8c2bf_45%,#8e9a96_55%,#cdd5d2)] shadow-[0_6px_14px_rgb(20_30_25/0.18)]" />
      <div className={cn("absolute top-0 bottom-0 w-[180px]", rtl ? "right-[calc(50%-90px)]" : "left-[calc(50%-90px)]")}>
        {papers.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              if (el) els.current.set(p.id, el);
              else els.current.delete(p.id);
            }}
            className="absolute top-[30px] w-[180px] origin-top will-change-transform"
          >
            <TicketPaper p={p} lang={lang} />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-r from-desk to-transparent rtl:bg-gradient-to-l" />
      <div className="pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-l from-desk to-transparent rtl:bg-gradient-to-r" />
    </div>
  );
}

function TicketPaper({ p, lang }: { p: Paper; lang: Lang }) {
  const tone = { new: "bg-saffron", preparing: "bg-sky", ready: "bg-mint" }[p.tone];
  return (
    <div className="relative">
      {/* The clip */}
      <div className="absolute top-0 left-1/2 z-10 h-[30px] w-[34px] -translate-x-1/2 rounded-[5px] bg-[linear-gradient(to_bottom,#eef2f0,#a9b4b0_60%,#8b9793)] shadow-[0_2px_5px_rgb(0_0_0/0.28)]" />
      <div
        className="relative mt-[22px] bg-white px-4 pt-6 pb-6 text-ink shadow-[0_14px_30px_-10px_rgb(20_30_25/0.35)]"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 8px), transparent calc(100% - 8px)), radial-gradient(circle at 6px calc(100% - 4px), transparent 4px, black 4.5px)",
          WebkitMaskSize: "100% 100%, 12px 100%",
          WebkitMaskRepeat: "no-repeat, repeat-x",
          maskImage: "linear-gradient(to bottom, black calc(100% - 8px), transparent calc(100% - 8px)), radial-gradient(circle at 6px calc(100% - 4px), transparent 4px, black 4.5px)",
          maskSize: "100% 100%, 12px 100%",
          maskRepeat: "no-repeat, repeat-x",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] text-muted">{lang === "ar" ? "طاولة" : "Table"}</p>
            <p className="text-[40px] leading-none font-semibold tracking-tight tnum">{p.table}</p>
          </div>
          <span className={cn("mt-1 size-3 rounded-full", tone)} aria-hidden />
        </div>
        <p className="mt-2 text-[12px] text-muted">{lang === "ar" ? `الجولة ${p.round}` : `Round ${p.round}`}</p>
        <div className="my-3 border-t border-dashed border-rule" />
        <ul className="space-y-1.5 text-[14px]">
          {p.lines.map(([q, name]) => (
            <li key={name} className="flex gap-2">
              <span className="w-6 shrink-0 font-semibold tnum">{q}×</span>
              <span className="min-w-0">{name}</span>
            </li>
          ))}
        </ul>
        {p.note ? <p className="mt-3 rounded-[6px] bg-saffron-soft px-2 py-1 text-[13px] text-[#7a5410]">{p.note}</p> : null}
      </div>
    </div>
  );
}
