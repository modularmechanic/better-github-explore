/**
 * How the Events tab filters and orders github.com/resources/events.
 *
 * Lived inside a `useMemo` in the view. Two rules in here are easy to get
 * wrong and were untested: on-demand content carries no date, so it belongs in
 * the `upcoming` and `all` filters but never in `past` — nothing undated can be
 * shown to have already happened — and the sort direction flips for past
 * events.
 */
import { matches } from '@/lib/format'
import type { ResourceEvent } from '@/types/github'
import type { Option } from '@/components/filter-controls'

export type EventWhen = 'upcoming' | 'past' | 'all'

export interface EventQuery {
  when?: EventWhen
  type?: string
  region?: string
  topic?: string
  search?: string
}

/** Filter options derived from the data itself, so a resync can add new ones. */
export function eventOptions(
  events: ResourceEvent[],
  key: keyof ResourceEvent,
  anyLabel: string,
): Option<string>[] {
  const values = [...new Set(events.map((e) => e[key]).filter(Boolean))] as string[]
  return [{ value: 'any', label: anyLabel }, ...values.sort().map((v) => ({ value: v, label: v }))]
}

/** Milliseconds, or null for on-demand content that carries no date. */
const at = (event: ResourceEvent) => (event.date ? new Date(event.date).getTime() : null)

/**
 * Events matching the filters, soonest first — or most recent first when
 * looking backwards.
 *
 * `now` is a parameter rather than a `Date.now()` call so the upcoming/past
 * split can be tested against a fixed clock.
 */
export function filterEvents(
  events: ResourceEvent[],
  query: EventQuery = {},
  now = Date.now(),
): ResourceEvent[] {
  const { when = 'upcoming', type = 'any', region = 'any', topic = 'any', search = '' } = query

  return events
    .filter((event) => {
      const time = at(event)
      // Undated on-demand content is always still available, so it counts as
      // upcoming; `past` below excludes it, since it never happened.
      if (when === 'upcoming' && time !== null && time < now) return false
      if (when === 'past' && (time === null || time >= now)) return false
      if (type !== 'any' && event.type !== type) return false
      if (region !== 'any' && event.region !== region) return false
      if (topic !== 'any' && event.topic !== topic) return false
      return matches(search, event.title, event.description, event.topic, event.region)
    })
    .sort((a, b) => {
      // Undated entries sort last in both directions.
      const left = at(a) ?? Infinity
      const right = at(b) ?? Infinity
      return when === 'past' ? right - left : left - right
    })
}
