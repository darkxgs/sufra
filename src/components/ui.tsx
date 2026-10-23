import { clsx, type ClassValue } from "clsx";
import type { ReactNode, SVGProps } from "react";
import { twMerge } from "tailwind-merge";

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

type Variant = "primary" | "outline" | "ghost" | "danger" | "brass" | "brass-outline" | "steel";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-zaatar text-white hover:bg-zaatar-deep active:bg-zaatar-deep",
  outline: "border border-rule bg-paper text-ink hover:border-faint hover:bg-well",
  ghost: "text-ink-2 hover:bg-rule-2 hover:text-ink",
  danger: "bg-pom text-white hover:brightness-95",
  brass: "bg-brass text-white hover:bg-brass-deep active:bg-brass-deep",
  "brass-outline": "border border-[#e3d7c4] bg-white text-slate hover:bg-brass-soft",
  steel: "border border-steel-4 bg-steel-3 text-chalk hover:bg-steel-4",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[14px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-[16px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap transition-[background-color,border-color,color,transform,filter] duration-150 select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/** An on/off switch that is a real checkbox underneath. */
export function Switch({ checked, onChange, label, disabled, className, tone = "zaatar" }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; className?: string; tone?: "zaatar" | "steel" }) {
  return (
    <label className={cn("relative inline-flex cursor-pointer items-center", disabled && "cursor-not-allowed opacity-60", className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span
        aria-hidden
        className={cn(
          "h-6 w-10 rounded-full transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
          tone === "steel" ? "bg-steel-4 peer-checked:bg-k-ready peer-focus-visible:outline-k-prep" : "bg-rule peer-checked:bg-zaatar peer-focus-visible:outline-zaatar",
        )}
      />
      <span aria-hidden className="absolute start-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
    </label>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 animate-spin", className)} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.6" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label className="grid gap-1.5">
        <span className="text-[14px] font-medium text-ink-2">{label}</span>
        {children}
      </label>
      {error ? <p className="text-[13px] text-pom">{error}</p> : hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-control border border-rule bg-paper px-3.5 text-[15px] text-ink placeholder:text-faint transition-colors focus:border-zaatar focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-zaatar/15";

/* ---------------------------------- icons --------------------------------- */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20, props: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const Icon = {
  plus: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  minus: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M5 12h14" />
    </svg>
  ),
  close: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  check: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  ),
  bell: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M4 17h16M6 17v-4a6 6 0 0 1 12 0v4M12 5V3.5M10 20h4" />
    </svg>
  ),
  receipt: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" />
    </svg>
  ),
  bag: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8zM9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  ),
  table: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M3.5 9h17M5.5 9l-1 10M18.5 9l1 10M7 13h10" />
    </svg>
  ),
  search: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  ),
  chili: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M14.5 6.5c3 .5 4.5 3.5 3.5 7-1.5 5-7 7.5-12 6.5 4-1.5 6.5-4 7-8 .2-2 .5-4.5 1.5-5.5z" />
      <path d="M14.5 6.5c0-2 1-3 2.5-3.5" />
    </svg>
  ),
  leaf: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15" />
      <path d="M5 19c3-4 6-7 10-9" />
    </svg>
  ),
  nut: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M12 3c4 0 7 3.5 7 8.5S16 21 12 21s-7-4.5-7-9.5S8 3 12 3z" />
      <path d="M12 6v12M8.5 9.5c2 1 5 1 7 0M8.5 14.5c2 1 5 1 7 0" />
    </svg>
  ),
  star: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M12 3.8l2.4 5 5.4.7-4 3.8 1 5.4L12 16.1l-4.8 2.6 1-5.4-4-3.8 5.4-.7z" />
    </svg>
  ),
  clock: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  volume: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  ),
  mute: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  ),
  expand: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
  undo: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M8 6L4 10l4 4" />
      <path d="M4 10h10a6 6 0 0 1 0 12h-2" />
    </svg>
  ),
  chevron: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  globe: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" />
    </svg>
  ),
  card: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <rect x="3" y="6" width="18" height="12.5" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  ),
  cash: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </svg>
  ),
  flame: ({ size, ...p }: IconProps) => (
    <svg {...base(size, p)}>
      <path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 3-5.7 4-9.3 2 1.6 2.6 3.6 2.4 5.5 1.3-.7 2-2 2.2-3.5 2.2 1.8 2.4 4.6 2.4 7.3 0 3.5-2.5 6.2-4.5 6.2z" />
    </svg>
  ),
};
