"use client";

import { useState } from "react";
import { pairCodeAction } from "@/app/[lang]/staff/actions";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { Qr } from "../qr";
import { buttonClass, Spinner } from "../ui";

/** A one-time QR that signs another screen (the kitchen tablet) in to this restaurant. */
export function PairPanel({ lang, origin, pinLine, initial }: { lang: Lang; origin: string; pinLine: string | null; initial: { code: string; expiresAt: string } }) {
  const t = dict(lang).home;
  const [code, setCode] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex gap-5 rounded-[20px] border border-rule bg-paper p-5 sm:p-6">
      <Qr value={`${origin}/${lang}/staff/pair/${code.code}`} label={t.tryKitchen} className="size-[132px] shrink-0 text-ink" />
      <div className="min-w-0">
        <h3 className="text-[18px] font-semibold">{t.tryKitchen}</h3>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{t.tryKitchenBody}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonClass("outline", "sm")}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setCode(await pairCodeAction());
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : null}
            {t.newCode}
          </button>
        </div>
        {pinLine ? <p className="mt-3 text-[13px] leading-relaxed text-muted">{pinLine}</p> : null}
      </div>
    </div>
  );
}
