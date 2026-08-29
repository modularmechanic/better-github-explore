import { compactNumber } from '@/lib/format'
import type { Slice } from '@/lib/explore-stats'

/**
 * Composition donut. Segments carry GitHub's own language colours so they match
 * the language dots on every card; because those brand hues are not a tuned
 * categorical palette, identity is also carried by the labels and the legend —
 * never by colour alone.
 */
const RADIUS = 54
const STROKE = 18
const GAP = 2 // surface gap between segments, in path units
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function DonutChart({
  slices, total, unit,
}: { slices: Slice[]; total: number; unit: string }) {
  /*
   * Each segment starts where the ones before it end, so the offsets are a
   * running total. Accumulated up front rather than with a `let` the map body
   * advances: mutating a variable mid-render makes the output depend on the
   * map running exactly once, in order, which is a promise React does not make
   * — a re-render that reuses part of the list would resume the count from
   * wherever it stopped and skew every segment after it.
   */
  const offsets: number[] = []
  let running = 0
  for (const slice of slices) {
    offsets.push(running)
    running += (slice.value / total) * CIRCUMFERENCE
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-start">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0" role="img" aria-label={`${unit} by share`}>
        <g transform="rotate(-90 70 70)">
          {slices.map((slice, i) => {
            const length = (slice.value / total) * CIRCUMFERENCE
            const dash = Math.max(0, length - GAP)
            const offset = offsets[i]
            return (
              <circle
                key={slice.label}
                cx="70" cy="70" r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                className="transition-opacity hover:opacity-80"
              >
                <title>{`${slice.label}: ${slice.value} ${unit} (${Math.round((slice.value / total) * 100)}%)`}</title>
              </circle>
            )
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" className="fill-foreground text-[19px] font-semibold">
          {compactNumber(total)}
        </text>
        <text x="70" y="82" textAnchor="middle" className="fill-muted-foreground text-[9px] tracking-wider uppercase">
          {unit}
        </text>
      </svg>

      {/* The legend doubles as the data table: name, count and share. */}
      <ul className="min-w-40 flex-1 space-y-1.5 text-xs">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
            <span className="truncate text-muted-foreground">{slice.label}</span>
            <span className="ml-auto font-mono text-foreground">{slice.value}</span>
            <span className="w-9 text-right font-mono text-muted-foreground">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
