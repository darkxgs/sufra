"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changePinAction, saveSettingsAction, type SettingsForm } from "@/app/[lang]/staff/actions";
import { dict } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/money";
import type { Lang, RestaurantInfo } from "@/lib/types";
import { buttonClass, cn, Field, inputClass, Spinner, Switch } from "../ui";

export function SettingsFormView({ lang, r }: { lang: Lang; r: RestaurantInfo }) {
  const t = dict(lang).settings;
  const router = useRouter();
  const [f, setF] = useState<SettingsForm>({
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    currency: r.currency,
    pricesIncludeVat: r.pricesIncludeVat,
    vat: String(r.vatBps / 100),
    service: String(r.serviceBps / 100),
    vatNumber: r.vatNumber ?? "",
    showCalories: r.showCalories,
    warnAfterMin: String(r.warnAfterMin),
    lateAfterMin: String(r.lateAfterMin),
    defaultLang: r.defaultLang,
  });
  const [state, setState] = useState<{ saving: boolean; msg: string | null; ok: boolean }>({ saving: false, msg: null, ok: false });
  const [pin, setPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const text = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setState({ saving: true, msg: null, ok: false });
          const res = await saveSettingsAction(f);
          setState({ saving: false, ok: res.ok, msg: res.ok ? t.saved : res.error === "name" ? dict(lang).menuAdmin.nameError : t.numberError });
          if (res.ok) router.refresh();
        }}
      >
        <Card title={t.names}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.nameAr}>
              <input className={inputClass} dir="rtl" lang="ar" value={f.nameAr} onChange={text("nameAr")} maxLength={60} required />
            </Field>
            <Field label={t.nameEn}>
              <input className={inputClass} dir="ltr" lang="en" value={f.nameEn} onChange={text("nameEn")} maxLength={60} required />
            </Field>
            <Field label={t.language}>
              <select className={inputClass} value={f.defaultLang} onChange={text("defaultLang")}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </Card>
        <Card title={t.pricing}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.currency}>
              <select className={inputClass} value={f.currency} onChange={text("currency")}>
                {Object.entries(CURRENCIES).map(([code, c]) => (
                  <option key={code} value={code}>
                    {code} ({c.ar})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.vatNumber}>
              <input className={cn(inputClass, "tnum")} dir="ltr" inputMode="numeric" value={f.vatNumber} onChange={text("vatNumber")} maxLength={20} />
            </Field>
            <Field label={t.vat}>
              <input className={cn(inputClass, "tnum")} dir="ltr" inputMode="decimal" value={f.vat} onChange={text("vat")} required />
            </Field>
            <Field label={t.service} hint={t.serviceHint}>
              <input className={cn(inputClass, "tnum")} dir="ltr" inputMode="decimal" value={f.service} onChange={text("service")} required />
            </Field>
          </div>
          <Toggle label={t.includeVat} hint={t.includeVatHint} checked={f.pricesIncludeVat} onChange={(v) => setF((x) => ({ ...x, pricesIncludeVat: v }))} />
          <Toggle label={t.calories} checked={f.showCalories} onChange={(v) => setF((x) => ({ ...x, showCalories: v }))} />
        </Card>
        <Card title={t.kitchenTimes}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.warn}>
              <input className={cn(inputClass, "tnum")} dir="ltr" inputMode="numeric" value={f.warnAfterMin} onChange={text("warnAfterMin")} required />
            </Field>
            <Field label={t.late}>
              <input className={cn(inputClass, "tnum")} dir="ltr" inputMode="numeric" value={f.lateAfterMin} onChange={text("lateAfterMin")} required />
            </Field>
          </div>
        </Card>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={state.saving} className={buttonClass("primary", "lg", "h-12")}>
            {state.saving ? <Spinner /> : null}
            {t.save}
          </button>
          {state.msg ? (
            <p role="status" className={cn("text-[14.5px]", state.ok ? "text-mint" : "text-pom")}>
              {state.msg}
            </p>
          ) : null}
        </div>
      </form>

      <Card title={t.pin}>
        {r.isDemo ? (
          <p className="text-[14.5px] text-muted">{t.demoLocked}</p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await changePinAction(pin);
              setPinMsg({ ok: res.ok, text: res.ok ? t.pinChanged : t.pinError });
              if (res.ok) setPin("");
            }}
          >
            <Field label={t.newPin} hint={t.pinHint} className="w-56">
              <input className={cn(inputClass, "tracking-[0.4em] tnum")} dir="ltr" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <button type="submit" className={buttonClass("outline", "md", "mb-6")}>
              {t.changePin}
            </button>
            {pinMsg ? <p className={cn("mb-6 text-[14px]", pinMsg.ok ? "text-mint" : "text-pom")}>{pinMsg.text}</p> : null}
          </form>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[18px] border border-rule bg-paper p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-6 border-t border-rule-2 pt-4">
      <div>
        <p className="text-[15px] font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-[13.5px] text-muted">{hint}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
