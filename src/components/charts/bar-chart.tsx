import type { Slice } from '@/lib/explore-stats'

/** Ranked horizontal bars: one measure, labels beside the marks. */
export function BarChart({ slices, unit }: { slices: Slice[]; unit: string }) {
  const max = Math.max(1, ...slices.map((s) => s.value))

  return (
    <ul className="space-y-2.5">
      {slices.map((slice) => (
        <li key={slice.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-xs">
          <span className="truncate text-muted-foreground" title={slice.label}>{slice.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full transition-opacity hover:opacity-80"
              style={{ width: `${(slice.value / max) * 100}%`, background: slice.color }}
              title={`${slice.label}: ${slice.value} ${unit}`}
            />
          </span>
          <span className="font-mono text-foreground">{slice.value}</span>
        </li>
      ))}
    </ul>
  )
}
