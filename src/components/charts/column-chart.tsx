import type { Slice } from '@/lib/explore-stats'

/** Change over time: one column per bucket, values direct-labelled above. */
export function ColumnChart({ slices, unit }: { slices: Slice[]; unit: string }) {
  const max = Math.max(1, ...slices.map((s) => s.value))

  return (
    <div className="flex h-40 items-end gap-2">
      {slices.map((slice) => (
        <div key={slice.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="font-mono text-xs text-muted-foreground">{slice.value}</span>
          <div
            className="w-full rounded-t-[4px] transition-opacity hover:opacity-80"
            style={{ height: `${Math.max(2, (slice.value / max) * 100)}%`, background: slice.color }}
            title={`${slice.label}: ${slice.value} ${unit}`}
          />
          <span className="text-xs text-muted-foreground">{slice.label}</span>
        </div>
      ))}
    </div>
  )
}
