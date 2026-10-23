"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/app/[lang]/staff/actions";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { buttonClass, Field, inputClass, Spinner } from "../ui";

export function SignInForm({ lang }: { lang: Lang }) {
  const t = dict(lang).login;
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, { error: null });
  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="lang" value={lang} />
      <Field label={t.code}>
        <input name="code" defaultValue={state.code} required autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" className={inputClass} placeholder="demo-ab12c" />
      </Field>
      <Field label={t.pin}>
        <input name="pin" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="current-password" dir="ltr" className={`${inputClass} tracking-[0.4em] tnum`} />
      </Field>
      {state.error ? (
        <p role="alert" className="text-[14px] text-pom">
          {state.error === "locked" ? t.locked : t.wrong}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "mt-1 h-12")}>
        {pending ? <Spinner /> : null}
        {t.submit}
      </button>
    </form>
  );
}
