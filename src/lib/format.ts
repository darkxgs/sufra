import type { Lang } from "./types";

/** Arabic counting: one and two have their own words, 3 to 10 take the plural, 11 and up the singular. */
export function arCount(n: number, f: { one: string; two: string; few: string; many: string }): string {
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  if (n >= 3 && n <= 10) return `${n} ${f.few}`;
  return `${n} ${f.many}`;
}

/** "9:14 pm" / "9:14 م", in the restaurant's time zone. Latin digits in both languages. */
export function clockTime(iso: string | Date, lang: Lang, timeZone: string): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit", hour12: lang === "ar", timeZone }).format(
    typeof iso === "string" ? new Date(iso) : iso,
  );
}

/** How long something has waited: "just now", "3 min", "1 h 5 min" / "الآن", "منذ 3 دقائق". */
export function waited(ms: number, lang: Lang): string {
  const m = Math.floor(Math.max(0, ms) / 60_000);
  if (lang === "ar") {
    const mins = (n: number) => arCount(n, { one: "دقيقة", two: "دقيقتين", few: "دقائق", many: "دقيقة" });
    if (m < 1) return "الآن";
    if (m < 60) return `منذ ${mins(m)}`;
    const h = Math.floor(m / 60);
    const hours = arCount(h, { one: "ساعة", two: "ساعتين", few: "ساعات", many: "ساعة" });
    return m % 60 ? `منذ ${hours} و${mins(m % 60)}` : `منذ ${hours}`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
