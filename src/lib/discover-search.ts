/**
 * Turning a Discover selection into repositories.
 *
 * A lens on its own is one search request. A lens narrowed to a whole category
 * is several, because GitHub's search refuses to OR qualifiers — asking for
 * `topic:physics OR topic:astronomy` is a 422 — so a bundle has to be fetched
 * one topic at a time and merged here. Each of those per-topic requests is an
 * ordinary cached call, so the second visit to a category costs nothing, and
 * two categories sharing a topic share its entry.
 *
 * Merging has to re-apply the ordering as well as remove duplicates: each slice
 * arrives sorted within itself, and concatenating them would otherwise leave
 * the results grouped by topic with every group restarting at the top.
 */
import { isListRepo, type Lens } from '@/lib/discover-lenses'
import type { Selection } from '@/lib/discover-selection'
import { searchRepos, type SearchOptions } from '@/lib/github-api'
import type { Repo } from '@/types/github'

/** One lens view: a single request, which the result list pages over. */
const PER_LENS = 100

/**
 * Per topic in a union. Lower than a single lens's page because a bundle runs
 * six to nine of these — nine hundred repositories is a slow parse for a view
 * that shows twenty-five at a time.
 */
const PER_TOPIC = 40

/** Client-side equivalents of GitHub's own sorts, for re-ordering a merge. */
const SERVER_ORDER: Record<Lens['sort'], (a: Repo, b: Repo) => number> = {
  stars: (a, b) => b.stargazers_count - a.stargazers_count,
  updated: (a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at),
}

/** Apply the two domain overrides without weakening any other lens. */
function withCategoryFloor(query: string, selection: Selection): string {
  const floor = selection.lens.slug === 'gems'
    ? selection.category?.hiddenGemsFloor
    : undefined
  if (floor === undefined) return query
  return query.replace(/stars:\d+\.\.(\d+)/, `stars:${floor}..$1`)
}

/** The query for one topic of a selection, or the bare lens query without one. */
export const queryFor = (selection: Selection, topic?: string): string => {
  const { lens, year, maintained } = selection
  const query = withCategoryFloor(lens.query(year, maintained), selection)
  return topic ? `${query} topic:${topic}` : query
}

const optionsFor = (selection: Selection, perPage: number): SearchOptions => ({
  perPage,
  sort: selection.lens.sort,
})

const fetchQuery = (selection: Selection, topic: string | undefined, perPage: number) =>
  searchRepos(queryFor(selection, topic), optionsFor(selection, perPage))
    .then((res) => res.items)

/**
 * The topics a selection actually searches: one chosen topic, every topic in
 * the category, or none at all when no category is active.
 */
const topicsOf = ({ category, topic }: Selection): (string | undefined)[] => {
  if (!category) return [undefined]
  return topic ? [topic] : category.topics
}

/**
 * Everything one Discover view shows, curated and ordered.
 *
 * The reading-list cull runs here rather than per lens because every lens wants
 * it — the live top ten of both Rising Stars and Fresh Finds carried lists
 * before it did.
 */
async function loadSelection(selection: Selection): Promise<SelectionResult> {
  const { lens } = selection
  const topics = topicsOf(selection)
  const perPage = topics.length > 1 ? PER_TOPIC : PER_LENS

  // Concurrently: a nine-topic bundle run in series is nine round trips of
  // latency for a view the user is waiting on, and the shared cache means a
  // repeat visit issues none of them.
  //
  // allSettled, not all: a bundle is nine independent searches, and `all`
  // would throw away eight good ones because the ninth hit a rate limit. A
  // category is still worth reading eight-ninths complete — `missing` says how
  // short it is — and only a total failure is an error worth showing.
  const settled = await Promise.allSettled(
    topics.map((topic) => fetchQuery(selection, topic, perPage)),
  )
  const slices = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []))
  if (!slices.length) {
    throw (settled[0] as PromiseRejectedResult).reason
  }

  const seen = new Map<number, Repo>()
  for (const repo of slices.flat()) {
    if (!isListRepo(repo)) seen.set(repo.id, repo)
  }

  const merged = [...seen.values()].sort(SERVER_ORDER[lens.sort])
  return {
    items: lens.rank ? lens.rank(merged) : merged,
    missing: settled.length - slices.length,
    total: settled.length,
  }
}

export interface SelectionResult {
  items: Repo[]
  /** Topics of a bundle whose search failed. Zero for a whole result. */
  missing: number
  /** Searches this result was assembled from — the denominator for `missing`. */
  total: number
}

/** Results, plus how much of a bundle could not be fetched. */
export async function fetchSelectionResult(selection: Selection): Promise<SelectionResult> {
  return loadSelection(selection)
}

/** Existing list-only interface used by the Explore teaser. */
export async function fetchSelection(selection: Selection): Promise<Repo[]> {
  return (await fetchSelectionResult(selection)).items
}

/** How many requests this selection costs on a cold cache. Shown to the user. */
export const requestCost = (selection: Selection): number => topicsOf(selection).length
