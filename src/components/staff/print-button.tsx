"use client";

import { buttonClass } from "../ui";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className={buttonClass("primary", "md")} onClick={() => window.print()}>
      {label}
    </button>
  );
}
