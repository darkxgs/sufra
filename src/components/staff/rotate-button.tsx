"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { rotateTokenAction } from "@/app/[lang]/staff/actions";
import { buttonClass, Spinner } from "../ui";

/** Replaces a table's code (two taps: the first asks, the second does it). */
export function RotateButton({ tableId, label, hint }: { tableId: string; label: string; hint: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <span className="inline-flex flex-col items-center">
      <button
        type="button"
        disabled={busy}
        className={buttonClass(armed ? "danger" : "ghost", "sm")}
        onClick={async () => {
          if (!armed) {
            setArmed(true);
            window.setTimeout(() => setArmed(false), 4000);
            return;
          }
          setBusy(true);
          try {
            await rotateTokenAction(tableId);
            router.refresh();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
      >
        {busy ? <Spinner /> : null}
        {label}
      </button>
      {armed ? <span className="mt-1 max-w-[180px] text-center text-[12px] text-pom">{hint}</span> : null}
    </span>
  );
}
