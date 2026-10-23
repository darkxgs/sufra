"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Versioned = { v: number; now: string };

/**
 * Keeps a screen in step with the server. It asks "anything newer than v?"
 * every `interval` ms; the server answers 204 when nothing changed, so an idle
 * kitchen costs one tiny query per poll. Polling pauses while the tab is
 * hidden, catches up the moment it's visible again, and backs off when the
 * network drops. Responses older than what's on screen are ignored, so a slow
 * poll can't undo a newer update from the user's own action.
 */
export function useLive<T extends Versioned>(url: string, initial: T, interval: number) {
  const [data, setData] = useState(initial);
  const [offline, setOffline] = useState(false);
  // Server clock minus this device's clock, so timers agree with the kitchen's.
  const [offset, setOffset] = useState(() => new Date(initial.now).getTime() - Date.now());
  const version = useRef(initial.v);
  const timer = useRef<number | undefined>(undefined);
  const failures = useRef(0);
  const inflight = useRef<AbortController | null>(null);

  const accept = useCallback((next: T) => {
    if (next.v < version.current) return;
    version.current = next.v;
    setData(next);
    setOffset(new Date(next.now).getTime() - Date.now());
  }, []);

  // The poll loop lives in one effect; `refresh` reaches into it through a ref.
  const kick = useRef<() => void>(() => {});
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      window.clearTimeout(timer.current);
      if (stopped || document.visibilityState === "hidden") return;
      inflight.current?.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;
      try {
        const sep = url.includes("?") ? "&" : "?";
        const res = await fetch(`${url}${sep}v=${version.current}`, { cache: "no-store", signal: ctrl.signal });
        if (res.status === 200) accept((await res.json()) as T);
        else if (res.status !== 204) throw new Error(String(res.status));
        failures.current = 0;
        setOffline(false);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        failures.current += 1;
        if (failures.current >= 2) setOffline(true);
      }
      if (stopped) return;
      const wait = failures.current ? Math.min(15_000, interval * 2 ** failures.current) : interval;
      timer.current = window.setTimeout(poll, wait);
    };
    kick.current = () => void poll();
    timer.current = window.setTimeout(poll, interval);
    const wake = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stopped = true;
      window.clearTimeout(timer.current);
      inflight.current?.abort();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [url, interval, accept]);

  /** Ask now (after this screen changed something). */
  const refresh = useCallback(() => kick.current(), []);

  return { data, setData: accept, offline, refresh, offset };
}

/** A clock that ticks every `ms`, for timers on tickets and tables. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
