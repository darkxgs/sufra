import type { ChosenOption, MenuItem, MenuOptionGroup } from "./types";

// Option rules live on each group: choose at least `min` and at most `max`.
// A group with min 1, max 1 is a required single choice (a size, a side);
// min 0 is optional ("add pine nuts"). The server runs the same checks the
// phone does, and prices are always worked out again on the server.

export type SelectionProblem = { groupId: string; kind: "too_few" | "too_many" };

/** What a new item sheet starts with: each group's defaults, if the rules allow them. */
export function defaultSelection(item: MenuItem): string[] {
  const out: string[] = [];
  for (const g of item.groups) {
    const defaults = g.options.filter((o) => o.isDefault).slice(0, g.max);
    out.push(...defaults.map((o) => o.id));
  }
  return out;
}

export function groupOf(item: MenuItem, optionId: string): MenuOptionGroup | undefined {
  return item.groups.find((g) => g.options.some((o) => o.id === optionId));
}

/** Choosing an option: single-choice groups swap, multi-choice groups toggle up to their limit. */
export function toggleOption(item: MenuItem, selected: string[], optionId: string): string[] {
  const g = groupOf(item, optionId);
  if (!g) return selected;
  const inGroup = (id: string) => g.options.some((o) => o.id === id);
  if (g.max === 1) {
    if (selected.includes(optionId)) return g.min === 1 ? selected : selected.filter((id) => id !== optionId);
    return [...selected.filter((id) => !inGroup(id)), optionId];
  }
  if (selected.includes(optionId)) return selected.filter((id) => id !== optionId);
  if (selected.filter(inGroup).length >= g.max) return selected;
  return [...selected, optionId];
}

export function problems(item: MenuItem, selected: string[]): SelectionProblem[] {
  const out: SelectionProblem[] = [];
  for (const g of item.groups) {
    const n = g.options.filter((o) => selected.includes(o.id)).length;
    if (n < g.min) out.push({ groupId: g.id, kind: "too_few" });
    if (n > g.max) out.push({ groupId: g.id, kind: "too_many" });
  }
  return out;
}

/** True when every chosen id belongs to this item. */
export function knownOptions(item: MenuItem, selected: string[]): boolean {
  const ids = new Set(item.groups.flatMap((g) => g.options.map((o) => o.id)));
  return selected.every((id) => ids.has(id)) && new Set(selected).size === selected.length;
}

/** The chosen options, in menu order, as they're printed on the ticket and the bill. */
export function chosen(item: MenuItem, selected: string[]): ChosenOption[] {
  const out: ChosenOption[] = [];
  for (const g of item.groups) {
    for (const o of g.options) {
      if (selected.includes(o.id)) out.push({ groupAr: g.nameAr, groupEn: g.nameEn, nameAr: o.nameAr, nameEn: o.nameEn, delta: o.priceDelta });
    }
  }
  return out;
}

export function unitPrice(item: MenuItem, selected: string[]): number {
  return item.price + item.groups.flatMap((g) => g.options).reduce((s, o) => s + (selected.includes(o.id) ? o.priceDelta : 0), 0);
}

export function unitCalories(item: MenuItem, selected: string[]): number | null {
  if (item.calories == null) return null;
  return item.calories + item.groups.flatMap((g) => g.options).reduce((s, o) => s + (selected.includes(o.id) ? o.caloriesDelta : 0), 0);
}

/** Two cart lines are the same dish when the item, options and note match; adding one again raises the quantity. */
export function lineKey(itemId: string, selected: string[], note: string): string {
  return `${itemId}|${[...selected].sort().join(",")}|${note.trim().toLowerCase()}`;
}
