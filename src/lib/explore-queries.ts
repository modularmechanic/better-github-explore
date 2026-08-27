import type { ChartWindow } from '@/lib/explore-stats'
import type { ResourceEvent } from '@/types/github'

/**
 * The window the charts describe, and the query that backs it. A higher star
 * floor on longer windows keeps the set to genuine breakouts rather than noise.
 */
const WINDOW_QUERY: Record<ChartWindow, { days: number; minStars: number }> = {
  day: { days: 1, minStars: 10 },
  week: { days: 7, minStars: 50 },
  month: { days: 30, minStars: 100 },
}

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

/** The `search/repositories` query for a given trending window. */
export const trendingQuery = (w: ChartWindow) =>
  `created:>${since(WINDOW_QUERY[w].days)} stars:>=${WINDOW_QUERY[w].minStars}`

/** Dated events still to come, soonest first. */
export const upcomingEvents = (events: ResourceEvent[]) =>
  events
    .filter((event) => event.date && new Date(event.date).getTime() >= Date.now())
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
