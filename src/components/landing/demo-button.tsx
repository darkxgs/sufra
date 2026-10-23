"use client";

import { useActionState } from "react";
import { startDemoAction, type DemoState } from "@/app/[lang]/actions";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { buttonClass, Spinner } from "../ui";

export function DemoButton({ lang, className }: { lang: Lang; className?: string }) {
  const t = dict(lang);
  const [state, action, pending] = useActionState<DemoState, FormData>(startDemoAction, { error: null });
  return (
    <form action={action} className={className}>
      <input type="hidden" name="lang" value={lang} />
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "h-13 rounded-[14px] px-6 text-[16px]")}>
        {pending ? <Spinner /> : null}
        {pending ? t.landing.starting : t.landing.start}
      </button>
      {state.error ? (
        <p role="alert" className="mt-3 max-w-sm text-[14px] text-pom">
          {state.error === "rate" ? t.errors.demoRate : t.errors.demoFull}
        </p>
      ) : null}
    </form>
  );
}
