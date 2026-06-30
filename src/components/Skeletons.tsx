import { AppShell } from "@/components/AppShell";

/** A shimmering placeholder block. Wraps content space while data loads. */
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer relative overflow-hidden rounded-md bg-[var(--surface-elevated)]/60 ${className}`}
    />
  );
}

/** Placeholder for the performance / line chart area. */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ height }}
      role="status"
      aria-label="Loading chart"
    >
      <div className="shimmer absolute inset-0 rounded-lg bg-[var(--surface-elevated)]/40" />
      {/* Faux gridlines for shape continuity */}
      <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-40">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-px w-full bg-hairline" />
        ))}
      </div>
    </div>
  );
}

/** Dashboard-shaped skeleton shown inside the app chrome during slow loads. */
export function DashboardSkeleton() {
  return (
    <AppShell>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="mt-3 h-10 w-44" />
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline pt-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Shimmer className="h-2.5 w-20" />
                <Shimmer className="mt-2 h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="flex items-center justify-between">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-7 w-48" />
          </div>
          <div className="mt-4">
            <ChartSkeleton />
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-surface p-5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="mt-2 h-2.5 w-24" />
            <Shimmer className="mt-4 h-[200px] w-full" />
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-hairline bg-surface">
        <div className="border-b border-hairline px-6 py-4">
          <Shimmer className="h-5 w-24" />
        </div>
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Shimmer className="h-8 w-44" />
              <Shimmer className="ml-auto h-4 w-20" />
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
