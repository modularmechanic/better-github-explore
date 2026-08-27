/**
 * How the Topics tab orders the Explore feed.
 *
 * This lived inside a `useMemo` in the view, which made a rendered tab the only
 * way to reach it — three sort keys and a curation heuristic with no test. It
 * is pure: feed topics plus the filter state in, ordered topics out.
 */
import { matches } from '@/lib/format'
import type { Topic } from '@/types/github'

/**
 * How much editorial attention GitHub has given a topic. Topics they actually
 * wrote up — logo, description, release date, author — rank above bare slugs.
 */
export const curationScore = (topic: Topic) =>
  (topic.logo ? 2 : 0) +
  (topic.short_description ? 1 : 0) +
  (topic.released ? 1 : 0) +
  (topic.created_by ? 1 : 0)

export type TopicSort = 'curated' | 'az'

export interface TopicQuery {
  search?: string
  sort?: TopicSort
  /** Slugs the viewer starred. Always float to the top of whichever order is picked. */
  favourites?: readonly string[]
  /** Narrow to favourites only. */
  favouritesOnly?: boolean
}

const displayName = (topic: Topic) => topic.display_name || topic.topic_name
const byName = (a: Topic, b: Topic) => displayName(a).localeCompare(displayName(b))

/** Whether a topic answers the search box, across every field a card shows. */
export const topicMatches = (topic: Topic, search: string) =>
  matches(search, topic.topic_name, topic.display_name, topic.short_description, topic.aliases?.join(' '))

/**
 * Topics filtered and ordered for the tab.
 *
 * Three keys, in order: favourites first, then either A–Z or curation score,
 * with the name breaking a curation tie so the order is stable between renders.
 */
export function rankTopics(topics: Topic[], query: TopicQuery = {}): Topic[] {
  const { search = '', sort = 'curated', favourites = [], favouritesOnly = false } = query
  const starred = new Set(favourites)
  const isFavourite = (topic: Topic) => starred.has(topic.topic_name)

  return topics
    .filter((topic) => (!favouritesOnly || isFavourite(topic)) && topicMatches(topic, search))
    .sort(
      (a, b) =>
        Number(isFavourite(b)) - Number(isFavourite(a)) ||
        (sort === 'az' ? byName(a, b) : curationScore(b) - curationScore(a) || byName(a, b)),
    )
}
