"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// A guest's cart and visit live on their phone (localStorage), so a reload or
// a dropped connection keeps them. The server renders the empty state, and the
// stored value takes over right after hydration without a mismatch.

const EVENT = "sufra-storage";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useStoredState<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const value = useMemo<T>(() => {
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
    // `fallback` is a constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prevRaw = read(key);
      let prev = fallback;
      try {
        if (prevRaw != null) prev = JSON.parse(prevRaw) as T;
      } catch {}
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        if (v == null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(v));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set];
}
