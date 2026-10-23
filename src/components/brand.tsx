import type { Lang } from "@/lib/types";
import { cn } from "./ui";

/** Sufra's mark: a round table seen from above, with the code that sits on it. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="10.5" y="10.5" width="11" height="11" rx="2.6" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <rect x="14" y="14" width="4" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Logo({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <Mark className="size-7 text-zaatar" />
      <span className="text-[19px] font-semibold tracking-[-0.01em]">{lang === "ar" ? "سفرة" : "Sufra"}</span>
    </span>
  );
}

/** Jamr's wordmark, set in Ruqaa the way a grill's sign would be painted. */
export function JamrMark({ lang, className, name }: { lang: Lang; className?: string; name?: string }) {
  return (
    <span className={cn("font-ruqaa leading-none font-bold", className)} lang={lang}>
      {name ?? (lang === "ar" ? "جمر" : "Jamr")}
    </span>
  );
}
