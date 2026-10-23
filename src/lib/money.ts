import type { Lang } from "./types";

// Prices are integers in the currency's minor unit (halalas, piastres, fils).
// Digits stay Latin in both languages, as most menus in the region print them.

type CurrencyInfo = { exp: number; ar: string; en: string };
export const CURRENCIES: Record<string, CurrencyInfo> = {
  SAR: { exp: 2, ar: "ر.س", en: "SAR" },
  EGP: { exp: 2, ar: "ج.م", en: "EGP" },
  AED: { exp: 2, ar: "د.إ", en: "AED" },
  QAR: { exp: 2, ar: "ر.ق", en: "QAR" },
  KWD: { exp: 3, ar: "د.ك", en: "KWD" },
  BHD: { exp: 3, ar: "د.ب", en: "BHD" },
  OMR: { exp: 3, ar: "ر.ع", en: "OMR" },
  JOD: { exp: 3, ar: "د.أ", en: "JOD" },
};

const info = (currency: string): CurrencyInfo => CURRENCIES[currency] ?? { exp: 2, ar: currency, en: currency };

/** The amount as a plain number string: "42", "42.50", "1,250". Whole amounts drop their decimals. */
export function amount(minor: number, currency: string): string {
  const { exp } = info(currency);
  const unit = 10 ** exp;
  const whole = minor % unit === 0;
  return (minor / unit).toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : exp, maximumFractionDigits: exp });
}

/** "42 ر.س" in Arabic, "SAR 42" in English. */
export function money(minor: number, currency: string, lang: Lang): string {
  const c = info(currency);
  const n = amount(minor, currency);
  return lang === "ar" ? `${n} ${c.ar}` : `${c.en} ${n}`;
}

export const currencySymbol = (currency: string, lang: Lang) => info(currency)[lang];

/** Parses what staff type in a price box ("42", "42.5", "1,250.00") into minor units. */
export function parseAmount(text: string, currency: string): number | null {
  const clean = text.replace(/[,\s]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace("٫", ".");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const { exp } = info(currency);
  const [w, f = ""] = clean.split(".");
  if (f.length > exp) return null;
  return Number(w) * 10 ** exp + Number(f.padEnd(exp, "0") || 0);
}

export type BillSettings = { vatBps: number; serviceBps: number; pricesIncludeVat: boolean };
export type Bill = { subtotal: number; service: number; vat: number; total: number; vatIncluded: boolean };

const pct = (minor: number, bps: number) => Math.round((minor * bps) / 10_000);

/**
 * The bill for a table.
 * - Prices that include VAT (required in Saudi Arabia): any service charge is
 *   added on top, and the VAT inside the total is shown, not added.
 * - Prices before VAT (common in Egypt): service is added to the subtotal, then
 *   VAT on both, since the service charge is itself taxable.
 */
export function bill(subtotal: number, s: BillSettings): Bill {
  const service = pct(subtotal, s.serviceBps);
  if (s.pricesIncludeVat) {
    const total = subtotal + service;
    const vat = Math.round((total * s.vatBps) / (10_000 + s.vatBps));
    return { subtotal, service, vat, total, vatIncluded: true };
  }
  const vat = pct(subtotal + service, s.vatBps);
  return { subtotal, service, vat, total: subtotal + service + vat, vatIncluded: false };
}

/** "15%" or "12.5%" from basis points. */
export const percent = (bps: number) => `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
