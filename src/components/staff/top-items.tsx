/** The day's most ordered dishes as a ranked list with bars (one series, so no legend). */
export function TopItems({ items }: { items: { name: string; qty: number; label: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.qty));
  return (
    <ol className="grid gap-3.5">
      {items.map((i) => (
        <li key={i.name} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
            <span className="truncate">{i.name}</span>
            <span className="shrink-0 text-muted tnum">{i.label}</span>
          </div>
          <span className="h-2 rounded-e-[4px] bg-chart" style={{ width: `${Math.max(4, (i.qty / max) * 100)}%` }} aria-hidden />
        </li>
      ))}
    </ol>
  );
}
