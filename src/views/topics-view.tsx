import { useState } from 'react'
import { FeaturedTopicCard } from '@/components/featured-topic-card'
import { PageHero } from '@/components/page-hero'
import { ResultList } from '@/components/result-list'
import { SectionHeader } from '@/components/section-header'
import { TopicCard } from '@/components/topic-card'
import { ViewerTopicsSection } from '@/components/viewer-topics-section'
import { Badge } from '@/components/ui/badge'
import { Segmented, type Option } from '@/components/filter-controls'
import { useAsync } from '@/hooks/use-async'
import { useFavourites } from '@/hooks/use-favourites'
import { navigate } from '@/hooks/use-hash-route'
import { useResultList } from '@/hooks/use-result-list'
import { exploreFeed } from '@/lib/github-api'
import { matches } from '@/lib/format'
import { rankTopics, type TopicSort } from '@/lib/topics'
import snapshot from '@/data/topics-page.json'
import type { TopicsPage } from '@/types/explore-pages'

const SORTS: Option<TopicSort>[] = [
  { value: 'curated', label: 'Curated first' },
  { value: 'az', label: 'A–Z' },
]

/**
 * GitHub's editorial layer for /topics: the hero copy, the featured grid and
 * the popular slugs. explore-feed.github.com carries none of it, so it comes
 * from a build-time snapshot of the page instead.
 */
const page: TopicsPage = snapshot

/**
 * The Topics tab, shaped like github.com/topics: hero, featured topics, popular
 * topics, then the full list from the Explore feed with its own filters.
 *
 * The ordering rule lives in `lib/topics` and the paging in `ResultList`, so
 * what is left here is the page.
 *
 * The snapshot is a static import, so a *missing* file is a build error rather
 * than something to handle at runtime. What degrades here is an *empty* one: if
 * GitHub restyles the page and the parser comes back with nothing, both
 * editorial sections drop out and this tab is the feed-only list it was before.
 * The same guard covers a search term that no featured or popular entry matches.
 */
export function TopicsView({ search }: { search: string }) {
  const [sort, setSort] = useState<TopicSort>('curated')
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const { ids: favourites } = useFavourites('topics')
  const state = useAsync(() => exploreFeed().then((f) => f.topics), [])

  const list = useResultList(state, {
    select: (topics) => rankTopics(topics, { search, sort, favourites, favouritesOnly }),
    deps: [search, sort, favouritesOnly, favourites],
  })

  // The editorial sections answer the search box too, or filtering the list
  // below while an unrelated featured grid sits above it reads as a bug.
  const featured = page.featured.filter((t) => matches(search, t.slug, t.name, t.description))
  const popular = page.popular.filter((slug) => matches(search, slug))

  return (
    <div className="space-y-8">
      <PageHero {...page.hero} />

      <ViewerTopicsSection search={search} limit={12} />

      {featured.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Featured topics" blurb="The topics GitHub puts up front." />
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
            {featured.map((t) => <FeaturedTopicCard key={t.slug} topic={t} />)}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Popular topics" blurb="The topics GitHub lists as most used." />
          <div className="flex flex-wrap gap-2">
            {popular.map((slug) => (
              <Badge
                key={slug}
                variant="outline"
                className="h-7 cursor-pointer px-3 text-sm hover:border-primary/40 hover:text-primary"
                render={<button type="button" />}
                onClick={() => navigate('topics', slug)}
              >
                {slug}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="All topics" blurb="Every topic in the Explore feed, searchable." />

        <ResultList
          list={list}
          dense
          skeletonCount={16}
          emptyMessage={favouritesOnly
            ? 'No favourite topics yet — star one to pin it here.'
            : 'No topics match.'}
          summary={`${list.total} topics`}
          controls={
            <>
              <Segmented value={sort} options={SORTS} onChange={setSort} />
              <Segmented
                value={favouritesOnly ? 'favourites' : 'all'}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'favourites', label: `★ Favourites${favourites.length ? ` (${favourites.length})` : ''}` },
                ]}
                onChange={(v) => setFavouritesOnly(v === 'favourites')}
              />
            </>
          }
        >
          {(topics) => topics.map((t) => <TopicCard key={t.topic_name} topic={t} />)}
        </ResultList>
      </section>
    </div>
  )
}
