/** What a guest sees for the moment before the menu arrives: the same shapes, quietly. */
export function MenuSkeleton() {
  return (
    <div className="mx-auto min-h-dvh max-w-[640px] bg-white" aria-busy="true">
      <div className="h-[232px] animate-pulse bg-[#2a3032] sm:h-[260px]" />
      <div className="space-y-3 px-5 pt-5">
        <div className="h-3 w-2/3 rounded-full bg-[#eceeee]" />
        <div className="h-11 rounded-full bg-[#f2f3f3]" />
      </div>
      <div className="mt-6 flex gap-5 border-b border-black/[0.06] px-5 pb-4">
        {[64, 88, 72, 80].map((w) => (
          <div key={w} className="h-3.5 rounded-full bg-[#eceeee]" style={{ width: w }} />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 px-5 py-5">
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-1/2 rounded-full bg-[#eceeee]" />
            <div className="h-3 w-5/6 rounded-full bg-[#f2f3f3]" />
            <div className="h-3 w-1/4 rounded-full bg-[#eceeee]" />
          </div>
          <div className="size-[104px] animate-pulse rounded-[18px] bg-[#e7e9e9]" />
        </div>
      ))}
    </div>
  );
}
