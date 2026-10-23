import type { Lang } from "@/lib/types";
import { Photo } from "../photo";
import { cn, Icon } from "../ui";

// Small, static renderings of the three screens for the home page. They use
// the real tokens and photos, so they look like the product because they are.

export function PhoneMock({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  const rows = [
    { photo: "mixed-grill", name: ar ? "مشاوي مشكلة لشخصين" : "Mixed grill for two", price: ar ? "165 ر.س" : "SAR 165", count: 1 },
    { photo: "hummus", name: ar ? "حمص بالطحينة" : "Hummus", price: ar ? "18 ر.س" : "SAR 18", count: 0 },
    { photo: "karak", name: ar ? "شاي كرك" : "Karak tea", price: ar ? "9 ر.س" : "SAR 9", count: 2 },
  ];
  return (
    <div className="mx-auto w-[236px] rounded-[34px] border-[7px] border-[#1b1f21] bg-white shadow-[0_24px_50px_-20px_rgb(20_30_25/0.45)]">
      <div className="relative h-[92px] overflow-hidden rounded-t-[27px]">
        <Photo slug="cover" cover alt="" sizes="236px" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
        <span className={cn("absolute bottom-2.5 start-3.5 font-ruqaa text-[30px] leading-none font-bold text-white")}>{ar ? "جمر" : "Jamr"}</span>
        <span className="absolute end-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white backdrop-blur">{ar ? "طاولة 4" : "Table 4"}</span>
      </div>
      <ul className="divide-y divide-black/[0.06] px-3.5">
        {rows.map((r) => (
          <li key={r.photo} className="flex items-center gap-2.5 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-slate">{r.name}</span>
              <span className="block text-[11px] text-[#6b7174] tnum">{r.price}</span>
            </span>
            <span className="relative">
              <Photo slug={r.photo} alt="" sizes="48px" className="size-12 rounded-[10px]" />
              <span className={cn("absolute -bottom-1.5 end-1 grid size-5 place-items-center rounded-full text-[10px] font-semibold shadow", r.count ? "bg-brass text-white" : "bg-white text-slate")}>
                {r.count || <Icon.plus size={11} />}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="px-3 pt-1 pb-3.5">
        <div className="flex h-10 items-center justify-between rounded-[12px] bg-brass px-3 text-[12px] font-medium text-white">
          <span className="flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded-full bg-white/20 text-[10px]">3</span>
            {ar ? "اعرض الطلب" : "View order"}
          </span>
          <span className="tnum">{ar ? "183 ر.س" : "SAR 183"}</span>
        </div>
      </div>
    </div>
  );
}

export function KitchenMock({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  return (
    <div className="kitchen mx-auto w-full max-w-[300px] rounded-[18px] bg-steel p-3.5 shadow-[0_24px_50px_-20px_rgb(10_15_15/0.6)]">
      <div className="flex items-center justify-between px-1 pb-2.5 text-[11px] text-chalk-2">
        <span>{ar ? "جديد" : "New"}</span>
        <span className="tnum">21:42</span>
      </div>
      <div className="overflow-hidden rounded-[12px] bg-steel-2 ring-1 ring-steel-3">
        <div className="flex items-center justify-between bg-k-new px-3 py-2 text-steel">
          <span className="text-[22px] leading-none font-semibold tnum">{ar ? "ط4" : "T4"}</span>
          <span className="text-[12px] font-medium tnum">0:42</span>
        </div>
        <ul className="space-y-1.5 px-3 py-3 text-[13px] text-chalk">
          <li>
            <span className="font-semibold tnum">1×</span> {ar ? "مشاوي مشكلة لشخصين" : "Mixed grill for two"}
            <span className="block ps-5 text-[11.5px] text-chalk-2">{ar ? "أرز، بطاطا" : "Rice, fries"}</span>
            <span className="ms-5 mt-1 inline-block rounded bg-k-new/15 px-1.5 text-[11.5px] text-k-new">{ar ? "بدون بصل" : "No onions"}</span>
          </li>
          <li>
            <span className="font-semibold tnum">2×</span> {ar ? "شاي كرك" : "Karak tea"}
          </li>
        </ul>
        <div className="border-t border-steel-3 p-2.5">
          <div className="grid h-9 place-items-center rounded-[8px] bg-steel-3 text-[13px] font-medium text-chalk">{ar ? "ابدأ" : "Start"}</div>
        </div>
      </div>
    </div>
  );
}

export function FloorMock({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  const tables = [
    { l: "1", s: "free", c: "col-span-2" },
    { l: "2", s: "waiting", c: "col-span-2" },
    { l: "3", s: "ready", c: "col-span-2 rounded-full" },
    { l: "4", s: "waiting", c: "col-span-2 rounded-full" },
    { l: "5", s: "seated", c: "col-span-4" },
    { l: "6", s: "bill", c: "col-span-2" },
    { l: "7", s: "free", c: "col-span-2" },
  ];
  const tone: Record<string, string> = {
    free: "border-rule bg-paper text-muted",
    seated: "border-zaatar/30 bg-zaatar-soft text-zaatar-deep",
    waiting: "border-sky/40 bg-sky-soft text-[#1d5a8f]",
    ready: "border-mint/40 bg-mint-soft text-[#16653f]",
    bill: "border-saffron/50 bg-saffron-soft text-[#7a5410]",
  };
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[18px] border border-rule bg-paper p-4 shadow-[0_24px_50px_-24px_rgb(20_30_25/0.35)]">
      <div className="grid grid-cols-8 gap-2.5">
        {tables.map((t) => (
          <div key={t.l} className={cn("grid h-14 place-items-center rounded-[10px] border text-[15px] font-semibold tnum", tone[t.s], t.c)}>
            {t.l}
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 rounded-[10px] bg-saffron-soft px-3 py-2 text-[12px] text-[#7a5410]">
        <Icon.receipt size={14} />
        {ar ? "الطاولة 6 تطلب الفاتورة (بطاقة)" : "Table 6 wants the bill (card)"}
      </p>
    </div>
  );
}
