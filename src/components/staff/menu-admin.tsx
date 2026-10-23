"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { availabilityAction, saveItemAction, type ItemForm } from "@/app/[lang]/staff/actions";
import { dict, pick } from "@/lib/i18n";
import { amount, money } from "@/lib/money";
import type { Lang, Menu, MenuItem } from "@/lib/types";
import { Photo } from "../photo";
import { Sheet } from "../sheet";
import { buttonClass, cn, Field, inputClass, Spinner, Switch } from "../ui";

export function MenuAdmin({ lang, menu }: { lang: Lang; menu: Menu }) {
  const t = dict(lang);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [avail, setAvail] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const r = menu.restaurant;
  const station = (key: string | null) => {
    const st = menu.stations.find((x) => x.key === key);
    return st ? pick(lang, st.nameAr, st.nameEn) : "";
  };

  return (
    <div className="grid gap-8">
      {menu.categories.map((c) => (
        <section key={c.id} aria-labelledby={`c-${c.id}`}>
          <h2 id={`c-${c.id}`} className="mb-3 text-[17px] font-semibold">
            {pick(lang, c.nameAr, c.nameEn)}
          </h2>
          <ul className="divide-y divide-rule-2 overflow-hidden rounded-[16px] border border-rule bg-paper">
            {c.items.map((item) => {
              const on = avail[item.id] ?? item.available;
              return (
                <li key={item.id} className={cn("flex items-center gap-4 px-4 py-3 sm:px-5", !on && "bg-well")}>
                  <Photo slug={item.photo} alt="" sizes="52px" className={cn("size-[52px] shrink-0 rounded-[12px]", !on && "opacity-50 grayscale")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15.5px] font-medium">{pick(lang, item.nameAr, item.nameEn)}</p>
                    <p className="truncate text-[13.5px] text-muted">
                      <span className="tnum">{money(item.price, r.currency, lang)}</span>
                      <span className="ms-3">{station(item.stationKey)}</span>
                      {item.groups.length ? <span className="ms-3">{t.menuAdmin.options}: {item.groups.length}</span> : null}
                    </p>
                  </div>
                  <span className={cn("hidden text-[13.5px] sm:inline", on ? "text-ink-2" : "font-medium text-pom")} aria-hidden>
                    {on ? t.menuAdmin.available : t.menuAdmin.soldOut}
                  </span>
                  <Switch
                    checked={on}
                    label={`${pick(lang, item.nameAr, item.nameEn)}: ${on ? t.menuAdmin.available : t.menuAdmin.soldOut}`}
                    onChange={async (v) => {
                      setAvail((a) => ({ ...a, [item.id]: v }));
                      await availabilityAction(item.id, v);
                      startTransition(() => router.refresh());
                    }}
                  />
                  <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setEditing(item)}>
                    {t.menuAdmin.edit}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Sheet open={!!editing} onClose={() => setEditing(null)} label={editing ? pick(lang, editing.nameAr, editing.nameEn) : ""} closeLabel={t.guest.close}>
        {editing ? (
          <EditItem
            key={editing.id}
            item={editing}
            menu={menu}
            lang={lang}
            onSaved={() => {
              setEditing(null);
              startTransition(() => router.refresh());
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function EditItem({ item, menu, lang, onSaved }: { item: MenuItem; menu: Menu; lang: Lang; onSaved: () => void }) {
  const t = dict(lang).menuAdmin;
  const r = menu.restaurant;
  const [f, setF] = useState<ItemForm>({
    id: item.id,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    descAr: item.descAr ?? "",
    descEn: item.descEn ?? "",
    price: amount(item.price, r.currency).replace(/,/g, ""),
    calories: item.calories == null ? "" : String(item.calories),
    station: item.stationKey ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof ItemForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form
      className="grid gap-4 px-5 pt-2 pb-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          const res = await saveItemAction(f);
          if (res.ok) onSaved();
          else setError(res.field === "price" ? t.priceError : res.field === "name" ? t.nameError : res.field === "calories" ? dict(lang).settings.numberError : t.nameError);
        } finally {
          setSaving(false);
        }
      }}
    >
      <h2 className="text-[20px] font-semibold">{pick(lang, item.nameAr, item.nameEn)}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.nameAr}>
          <input className={inputClass} dir="rtl" lang="ar" value={f.nameAr} onChange={set("nameAr")} maxLength={80} required />
        </Field>
        <Field label={t.nameEn}>
          <input className={inputClass} dir="ltr" lang="en" value={f.nameEn} onChange={set("nameEn")} maxLength={80} required />
        </Field>
        <Field label={t.descAr}>
          <textarea className={cn(inputClass, "h-auto py-2.5")} rows={3} dir="rtl" lang="ar" value={f.descAr} onChange={set("descAr")} maxLength={300} />
        </Field>
        <Field label={t.descEn}>
          <textarea className={cn(inputClass, "h-auto py-2.5")} rows={3} dir="ltr" lang="en" value={f.descEn} onChange={set("descEn")} maxLength={300} />
        </Field>
        <Field label={`${t.price} (${r.currency})`}>
          <input className={cn(inputClass, "tnum")} inputMode="decimal" dir="ltr" value={f.price} onChange={set("price")} required />
        </Field>
        <Field label={t.calories}>
          <input className={cn(inputClass, "tnum")} inputMode="numeric" dir="ltr" value={f.calories} onChange={set("calories")} />
        </Field>
        <Field label={t.station}>
          <select className={inputClass} value={f.station} onChange={set("station")}>
            {menu.stations.map((st) => (
              <option key={st.key} value={st.key}>
                {pick(lang, st.nameAr, st.nameEn)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div>
        <p className="text-[14px] font-medium text-ink-2">{t.options}</p>
        {item.groups.length === 0 ? (
          <p className="mt-1 text-[14px] text-muted">{t.noOptions}</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {item.groups.map((g) => (
              <li key={g.id} className="rounded-[12px] bg-well px-3.5 py-2.5 text-[14px]">
                <span className="font-medium">{pick(lang, g.nameAr, g.nameEn)}</span>
                <span className="ms-2 text-muted">{t.rule(g.min, g.max)}</span>
                <span className="mt-1 block text-ink-2">
                  {g.options.map((o) => `${pick(lang, o.nameAr, o.nameEn)}${o.priceDelta ? ` (+${money(o.priceDelta, r.currency, lang)})` : ""}`).join(lang === "ar" ? "، " : ", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-[14px] text-pom">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={saving} className={buttonClass("primary", "lg", "h-12")}>
        {saving ? <Spinner /> : null}
        {t.save}
      </button>
    </form>
  );
}
