/**
 * Summary statistics for the Explore front page, computed from repositories the
 * page has already fetched — no extra API requests.
 */
import { languageColor } from '@/lib/language-colors'
import { starVelocity } from '@/lib/format'
import type { Repo } from '@/types/github'

export interface Slice {
  label: string
  value: number
  color: string
}

const OTHER_COLOR = '#8b97a8'

/** Share of trending repositories by language, with a single "Other" bucket. */
export function languageMix(repos: Repo[], max = 6): Slice[] {
  const counts = new Map<string, number>()
  for (const repo of repos) {
    const key = repo.language ?? 'Unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const top = ranked.slice(0, max).map(([label, value]) => ({
    label,
    value,
    color: label === 'Unknown' ? OTHER_COLOR : languageColor(label),
  }))
  const rest = ranked.slice(max).reduce((total, [, value]) => total + value, 0)
  return rest ? [...top, { label: 'Other', value: rest, color: OTHER_COLOR }] : top
}

/** The fastest-moving repositories, measured in stars per day. */
export const topMovers = (repos: Repo[], max = 7): Slice[] =>
  [...repos]
    .sort((a, b) => starVelocity(b) - starVelocity(a))
    .slice(0, max)
    .map((repo) => ({
      label: repo.name,
      value: Math.round(starVelocity(repo)),
      color: languageColor(repo.language),
    }))

/** The window the Explore charts are describing. */
export type ChartWindow = 'day' | 'week' | 'month'

/**
 * Bucket size, count and axis label per window. The label is a formatter rather
 * than options because an hour needs the time formatter — passing `hour` to
 * toLocaleDateString prints the whole date alongside it.
 */
const BUCKETS: Record<ChartWindow, { count: number; hours: number; label: (date: Date) => string }> = {
  day: { count: 8, hours: 3, label: (d) => d.toLocaleTimeString(undefined, { hour: 'numeric' }) },
  week: { count: 7, hours: 24, label: (d) => d.toLocaleDateString(undefined, { weekday: 'short' }) },
  month: { count: 6, hours: 24 * 5, label: (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) },
}

/**
 * When the repositories in view first appeared, bucketed to suit the window —
 * three-hour blocks over a day, days over a week, five-day blocks over a month.
 */
export function breakoutBuckets(repos: Repo[], window: ChartWindow, now = Date.now()): Slice[] {
  const { count, hours, label } = BUCKETS[window]
  const size = hours * 3_600_000

  return Array.from({ length: count }, (_, i) => {
    // Bucket 0 is the oldest; the last bucket ends at `now`.
    const end = now - (count - 1 - i) * size
    // The first bucket is open-ended. GitHub's `created:>YYYY-MM-DD` cuts at a
    // UTC midnight, so the result set reaches further back than count * size —
    // a fixed start would silently drop those repositories and the columns
    // would not add up to the total the tile above them reports.
    const start = i === 0 ? -Infinity : end - size
    return {
      label: label(new Date(end)),
      value: repos.filter((r) => {
        const created = new Date(r.created_at).getTime()
        return created > start && created <= end
      }).length,
      color: 'var(--link)',
    }
  })
}
