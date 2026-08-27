/**
 * A teaser slice of a list that may not have loaded yet.
 *
 * Defined locally inside `ExploreView`, where nothing else could reach it and
 * nothing tested it. The null case is the point: a list that has not arrived
 * stays null so `AsyncGrid` shows skeletons, rather than becoming an empty
 * array that would read as "nothing matched".
 */
export function pick<T>(items: T[] | null | undefined, count: number, keep: (item: T) => boolean = () => true): T[] | null {
  if (!items) return null
  return items.filter(keep).slice(0, count)
}
