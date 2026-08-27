/**
 * How the Collections tab orders the Explore feed, and how it personalises.
 *
 * Both rules lived inside `useMemo`s in the view. The overlap match in
 * particular carries a correctness detail — GitHub's casing is not guaranteed
 * to agree between the feed payload and the `/user/*` payloads — that had no
 * test because there was no interface to test it through.
 */
import { matches, stripHtml } from '@/lib/format'
import type { Collection, Repo } from '@/types/github'

/**
 * Position on github.com/collections, from the build-time snapshot.
 *
 * Anything the snapshot does not name — a collection added to the feed since
 * the capture, or every collection if the snapshot is empty — sorts behind
 * everything it does, where the size ordering still decides.
 */
export function collectionOrder(order: readonly string[]): (name: string) => number {
  const positions = new Map(order.map((slug, i) => [slug, i]))
  return (name) => positions.get(name) ?? Number.MAX_SAFE_INTEGER
}

export interface CollectionQuery {
  search?: string
  favourites?: readonly string[]
  favouritesOnly?: boolean
  /** From `collectionOrder`. Omit to fall back to size ordering alone. */
  rank?: (name: string) => number
}

/**
 * Whether a collection answers the search box.
 *
 * Every list of collections must agree on this, or the same term shows a
 * collection in one section and hides it in another — which is what happened
 * when the personalised section searched only the name and title while the main
 * list also searched the description and the repository names inside it.
 */
export const collectionMatches = (collection: Collection, search: string) =>
  matches(
    search,
    collection.name,
    collection.display_name,
    stripHtml(collection.content),
    collection.items.join(' '),
  )

/**
 * Collections filtered and ordered for the tab: favourites first, then
 * GitHub's own page order, then the biggest collections.
 */
export function rankCollections(
  collections: Collection[],
  query: CollectionQuery = {},
): Collection[] {
  const { search = '', favourites = [], favouritesOnly = false, rank = () => 0 } = query
  const starred = new Set(favourites)
  const isFavourite = (c: Collection) => starred.has(c.name)

  return collections
    .filter((c) => (!favouritesOnly || isFavourite(c)) && collectionMatches(c, search))
    .sort(
      (a, b) =>
        Number(isFavourite(b)) - Number(isFavourite(a)) ||
        rank(a.name) - rank(b.name) ||
        b.items.length - a.items.length,
    )
}

/**
 * Every collection the viewer already has repositories in, most overlap first.
 *
 * GitHub has no collections API to personalise against directly, but the feed
 * already gives each collection its `items` (repo `full_name`s) and the
 * viewer's starred and watched repositories are already in hand, so the overlap
 * is free. Lower-cased on BOTH sides: GitHub's casing is not guaranteed to
 * match between the two payloads, and a case-sensitive compare silently returns
 * an empty section rather than failing.
 *
 * Deliberately unfiltered and uncapped. Searching and capping are the caller's
 * job precisely because order matters: narrowing to four *before* applying the
 * search box would hide a matching collection that happens to rank fifth by
 * overlap, and re-sorting afterwards would throw away the overlap ranking that
 * is the entire point of the section.
 */
export function collectionsForViewer(
  collections: Collection[],
  viewerRepos: Repo[],
): Collection[] {
  if (!viewerRepos.length) return []
  const owned = new Set(viewerRepos.map((r) => r.full_name.toLowerCase()))

  return collections
    .map((c) => ({ c, hits: c.items.filter((n) => owned.has(n.toLowerCase())).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.c)
}

/** The largest collection in a set, floored at 1 — the denominator a card's bar needs. */
export const largestIn = (collections: Collection[]) =>
  Math.max(...collections.map((c) => c.items.length), 1)
