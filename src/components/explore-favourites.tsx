import { useMemo } from 'react'
import { CollectionCard } from '@/components/collection-card'
import { SectionHeader } from '@/components/section-header'
import { TopicCard } from '@/components/topic-card'
import { useFavourites } from '@/hooks/use-favourites'
import type { ExploreFeed } from '@/types/github'

/**
 * The topics and collections the viewer starred, moved out of `ExploreView`
 * verbatim: same two `useFavourites` calls, same `useMemo`s, same behaviour.
 * Renders nothing when both lists are empty.
 */
export function ExploreFavourites({ feed }: { feed: ExploreFeed | null }) {
  const favouriteTopics = useFavourites('topics')
  const favouriteCollections = useFavourites('collections')

  const starred = useMemo(() => {
    if (!feed) return null
    return [
      ...feed.topics.filter((t) => favouriteTopics.isFavourite(t.topic_name)),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, favouriteTopics.ids])

  const starredCollections = useMemo(() => {
    if (!feed) return null
    return feed.collections.filter((c) => favouriteCollections.isFavourite(c.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, favouriteCollections.ids])

  if (!starred?.length && !starredCollections?.length) return null

  return (
    <section className="space-y-3">
      <SectionHeader title="Your favourites" blurb="Topics and collections you starred." />
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
        {starred?.map((t) => <TopicCard key={t.topic_name} topic={t} />)}
        {starredCollections?.map((c) => (
          <CollectionCard
            key={c.name}
            collection={c}
            largest={Math.max(...(starredCollections.map((x) => x.items.length)), 1)}
          />
        ))}
      </div>
    </section>
  )
}
