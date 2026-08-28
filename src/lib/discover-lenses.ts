/**
 * The lenses behind the Discover tab — our own trending, as opposed to GitHub's.
 *
 * The Trending tab mirrors github.com/trending exactly: stars gained inside a
 * window, GitHub's ranking, nothing invented. These are the deliberate
 * opposite. Each lens is a search query we chose, answering a discovery
 * question the trending page cannot ask — what is quietly good, what old thing
 * is still cared for, what appeared this week. Both sets of results are
 * "trending" in the ordinary sense of the word; naming each lens on the rail is
 * what keeps the two honest about which is which.
 *
 * This module is definitions only. Route encoding lives in
 * `discover-selection`; fetching lives in `discover-search`.
 */
import type { Option } from '@/components/filter-controls'
import { since } from '@/lib/explore-queries'
import { starVelocity } from '@/lib/format'
import type { Repo } from '@/types/github'

/** Forks inherit their upstream's signals, and archived repos are not finds. */
const LIVE = 'fork:false archived:false'

/** Sleeping Giants is the exception: an archived giant is exactly its subject. */
const NO_FORKS = 'fork:false'

/** Repositories created before this are "old" for the vintage lens. */
const VINTAGE = '2018-01-01'

const LIST_NAME = /awesome|roadmap|interview|cheat-?sheet|resources|handbook/i

/**
 * Phrases that only a collection describes itself with.
 *
 * Deliberately built from noun phrases rather than bare words: "list of" and
 * "collection of" introduce a catalogue, while "list" alone would cull a task
 * list manager and "collection" a data-structures library.
 */
const LIST_DESCRIPTION =
  /\b(?:curated|awesome)\b|\b(?:list|collection|compilation|catalogue|catalog|index) of\b|\b(?:curriculum|roadmap|cheat ?sheets?|tutorials?|interview questions|learning path)\b/i

/**
 * Reading lists and curricula rather than software to run.
 *
 * Three signals, because no one of them is enough. `NOT awesome in:name` culls
 * the obvious ones server-side; a repository GitHub detected no language in is
 * almost never a program; and the biggest lists of all give themselves away
 * only in their description — `public-apis`, `freeCodeCamp` and
 * `project-based-learning` led Rock Solid against the live API with names that
 * look like software and descriptions that say "list of", "curriculum" and
 * "curated list of tutorials".
 *
 * All three misfire occasionally, which is why this is a curation pass over
 * results rather than part of any query: a false positive costs one card, not
 * a whole search.
 */
export const isListRepo = (repo: Repo): boolean =>
  LIST_NAME.test(repo.name) ||
  repo.language === null ||
  LIST_DESCRIPTION.test(repo.description ?? '')

/**
 * Most stars per day since creation first.
 *
 * Copies rather than sorting in place: a cache hit hands every caller the same
 * array, so an in-place sort here would reorder somebody else's results.
 */
const byMomentum = (repos: Repo[]): Repo[] =>
  [...repos].sort((a, b) => starVelocity(b) - starVelocity(a))

export type LensSlug = 'gems' | 'rising' | 'gold' | 'fresh' | 'solid' | 'giants' | 'hungry' | 'class'

export interface Lens {
  slug: LensSlug
  label: string
  /** One line under the heading: what this lens is looking for. */
  blurb: string
  /**
   * Day-rounded, so a day's visitors all share one cache entry. Takes the
   * selected year, which only the Class lens reads — the rest declare no
   * parameter and ignore it.
   */
  query: (year: number, maintained?: boolean) => string
  /** GitHub's own ordering. A union re-applies it after merging. */
  sort: 'stars' | 'updated'
  /**
   * Reorders the page GitHub returned, where the server's ordering is not the
   * one the lens means. The reading-list cull is not here — every lens wants
   * it, so it happens once, in `discover-search`.
   */
  rank?: (repos: Repo[]) => Repo[]
}

export const LENSES: Record<LensSlug, Lens> = {
  gems: {
    slug: 'gems',
    label: 'Hidden Gems',
    blurb: 'Enough stars to be real, few enough to still be a find — and pushed to this month.',
    query: () =>
      `stars:100..1500 pushed:>${since(30)} topics:>=3 size:>200 NOT awesome in:name ${LIVE}`,
    // 37k repositories match, and sorting by push date takes the hundred
    // touched most recently — measured against the live API, a window about six
    // minutes wide. The set is therefore never the same twice, which is the
    // point: sorting by stars instead would pin the same hundred forever.
    sort: 'updated',
    // Ranked by momentum within that live slice, so the best of what is in
    // front of us leads rather than whoever pushed most recently.
    rank: byMomentum,
  },
  rising: {
    slug: 'rising',
    label: 'Rising Stars',
    // forks:>10 is the anti-star-farm clause: bought stars do not bring forks.
    blurb: 'Young repositories climbing fast, with the forks to show the interest is real.',
    query: () => `created:>${since(90)} stars:>200 forks:>10 ${LIVE}`,
    sort: 'stars',
    rank: byMomentum,
  },
  gold: {
    slug: 'gold',
    label: 'Old But Gold',
    blurb: 'Written years ago and still being worked on today, newest commits first.',
    query: () => `created:<${VINTAGE} pushed:>${since(30)} stars:5000..80000 ${LIVE}`,
    // By push date, not stars. Sorted by stars the ceiling was unreachable —
    // the hundred on screen ran 49k to 78k (elasticsearch, grafana, tensorflow),
    // the household names this lens exists to look past. By push date the same
    // query spans the whole band, median about 15k.
    sort: 'updated',
  },
  fresh: {
    slug: 'fresh',
    label: 'Fresh Finds',
    blurb: 'Born this week and already being noticed.',
    query: () => `created:>${since(7)} stars:>15 size:>100 ${LIVE}`,
    sort: 'stars',
  },
  solid: {
    slug: 'solid',
    label: 'Rock Solid',
    blurb: 'The dependable ones: heavily starred and still pushed this week.',
    query: () => `stars:>10000 pushed:>${since(7)} ${LIVE}`,
    // The household names are the point here, so stars — the one lens where
    // the famous answer is the right answer.
    sort: 'stars',
  },
  giants: {
    slug: 'giants',
    label: 'Sleeping Giants',
    blurb: 'Thousands of stars, untouched for a year. Somebody could pick these back up.',
    // Archived repositories are kept deliberately: an archived giant is the
    // purest case of the thing this lens is looking for.
    query: () => `stars:>3000 pushed:<${since(365)} ${NO_FORKS}`,
    sort: 'stars',
  },
  hungry: {
    slug: 'hungry',
    label: 'Community Hungry',
    blurb: 'Active projects asking for help, with issues already labelled for newcomers.',
    query: () =>
      `good-first-issues:>5 help-wanted-issues:>2 stars:200..8000 pushed:>${since(14)} ${LIVE}`,
    // Not GitHub's `help-wanted-issues` sort: those counts are not in the
    // search payload, so an ordering by them would be invisible on the cards
    // and impossible to merge across a category union. Recency is both.
    sort: 'updated',
  },
  class: {
    slug: 'class',
    label: 'Class of…',
    blurb: 'The software of one particular year, whatever became of it since.',
    // The one lens with a parameter. A whole calendar year, not a rolling
    // window, so the set is stable enough to be worth linking to.
    query: (year, maintained = false) =>
      `created:${year}-01-01..${year}-12-31 stars:>1000${maintained ? ` pushed:>${since(365)}` : ''} ${LIVE}`,
    sort: 'stars',
  },
}

/** Where `#/discover` lands, and the fallback for a lens slug we do not know. */
export const DEFAULT_LENS: LensSlug = 'gems'

export const LENS_OPTIONS: Option<LensSlug>[] = Object.values(LENSES).map((lens) => ({
  value: lens.slug,
  label: lens.label,
}))
