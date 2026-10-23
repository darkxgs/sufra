"use client";

import { useMemo, useState } from "react";
import type { Lang, Menu, MenuItem } from "@/lib/types";
import { ItemSheet } from "./item-sheet";
import { MenuView } from "./menu-view";

export function BrowseMenu({ lang, menu, langHref }: { lang: Lang; menu: Menu; langHref: string }) {
  const [sheet, setSheet] = useState<{ item: MenuItem | null; open: boolean }>({ item: null, open: false });
  const unavailable = useMemo(() => new Set(menu.categories.flatMap((c) => c.items.filter((i) => !i.available).map((i) => i.id))), [menu]);
  return (
    <>
      <MenuView menu={menu} lang={lang} unavailable={unavailable} langHref={langHref} onOpen={(item) => setSheet({ item, open: true })} />
      <ItemSheet
        item={sheet.item}
        editing={null}
        open={sheet.open}
        lang={lang}
        currency={menu.restaurant.currency}
        showCalories={menu.restaurant.showCalories}
        soldOut={sheet.item ? unavailable.has(sheet.item.id) : false}
        browseOnly
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={() => {}}
      />
    </>
  );
}
