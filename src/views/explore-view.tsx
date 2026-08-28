import { useMemo, useState } from 'react'
import { CollectionCard } from '@/components/collection-card'
import { DeveloperCard } from '@/components/developer-card'
import { ExploreFavourites } from '@/components/explore-favourites'
import { ExploreSection } from '@/components/explore-section'
import { ExploreStats } from '@/components/explore-stats'
import { ExploreWatchlist } from '@/components/explore-watchlist'
import { RepoCard } from '@/components/repo-card'
import { ResourceEventCard } from '@/components/resource-event-card'
import { SponsorCard } from '@/components/sponsor-card'
import { TopicCard } from '@/components/topic-card'
import { ViewerSection } from '@/components/viewer-section'
import { ViewerTopicsSection } from '@/components/viewer-topics-section'
import { useAsync } from '@/hooks/use-async'
import { largestIn } from '@/lib/collections'
import { developersFrom } from '@/lib/developers'
import { LENSES } from '@/lib/discover-lenses'
import { DEFAULT_YEAR } from '@/lib/discover-selection'
import { fetchSelection } from '@/lib/discover-search'
import type { ChartWindow } from '@/lib/explore-stats'
import { trendingQuery, upcomingEvents } from '@/lib/explore-queries'
import { exploreFeed, searchRepos } from '@/lib/github-api'
import { findSponsorable } from '@/lib/sponsorable'
import { matches } from '@/lib/format'
import eventFeed from '@/data/github-events.json'
import type { ResourceEvent } from '@/types/github'

/** Static data, so there is nothing to load. */
const settled = <T,>(data: T[]) => ({ data, loading: false, error: null })

/** The front page: a slice of every section, the way github.com/explore reads. */
export function ExploreView({ search }: { search: string }) {
  const [chartWindow, setChartWindow] = useState<ChartWindow>('week')

  const trending = useAsync(
    () => searchRepos(trendingQuery('week'), { perPage: 30 }).then((r) => r.items),
    [],
  )

  // The charts follow their own window. On 'week' this is the same request key
  // as the section above, and api() shares a request already in flight, so the
  // default costs nothing extra even on a cold cache.
  const charted = useAsync(
    () => searchRepos(trendingQuery(chartWindow), { perPage: 30 }).then((r) => r.items),
    [chartWindow],
  )

  // Reuses the month key the charts fetch when switched to Month.
  const monthly = useAsync(
    () => searchRepos(trendingQuery('month'), { perPage: 30 }).then((r) => r.items),
    [],
  )
  const feed = useAsync(() => exploreFeed(), [])
  // A shallower scan than the Sponsors tab: this is a teaser, not the whole list.
  const sponsorable = useAsync(
    () => findSponsorable({ minStars: '5000', scan: 30 }).then((r) => r.funded),
    [],
  )

  const developers = useMemo(
    () => (trending.data ? developersFrom(trending.data) : null),
    [trending.data],
  )
  const repoMatches = (r: { full_name: string; description: string | null }) =>
    matches(search, r.full_name, r.description)

  return (
    <div className="space-y-10">
      <section className="space-y-1 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Everything happening on GitHub, in one place.
        </h1>
        <p className="max-w-[65ch] text-sm text-on-glow sm:text-base">
          Repositories breaking out this week, the developers behind them, curated topics and
          collections, live activity, and the projects you can fund — read as articles, not rows.
        </p>
      </section>

      <ExploreStats
        repos={charted.data}
        window={chartWindow}
        onWindow={setChartWindow}
        loading={charted.loading}
        error={charted.error}
      />

      <ExploreWatchlist search={search} />

      <ViewerTopicsSection search={search} limit={8} />

      <ExploreFavourites feed={feed.data} />

      <ExploreSection
        title="Trending this week"
        blurb="New repositories gaining stars fastest."
        seeAll={{ tab: 'trending', label: 'All trending' }}
        state={trending}
        limit={6}
        keep={repoMatches}
      >
        {(repos) => repos.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
      </ExploreSection>

      <ExploreSection
        title="Developers to watch"
        blurb="Whoever is behind this week's breakout repositories."
        seeAll={{ tab: 'trending', label: 'All developers' }}
        state={{ data: developers, loading: trending.loading, error: trending.error }}
        limit={4}
      >
        {(people) => people.map((d) => <DeveloperCard key={d.login} developer={d} />)}
      </ExploreSection>

      <ExploreSection
        title="Trending this month"
        blurb="The month's breakouts, held to a higher star floor."
        seeAll={{ tab: 'trending', label: 'All trending' }}
        state={monthly}
        limit={6}
        keep={repoMatches}
      >
        {(repos) => repos.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
      </ExploreSection>

      {/* Our own angle, next to GitHub's: the same request the Discover tab
          makes, so opening that tab from here costs nothing. */}
      <ViewerSection
        title={LENSES.gems.label}
        blurb={LENSES.gems.blurb}
        seeAll={{ tab: 'discover', label: 'All lenses' }}
        load={() => fetchSelection({
          lens: LENSES.gems,
          year: DEFAULT_YEAR,
          maintained: false,
          category: null,
          topic: null,
        })}
        select={(repos) => repos.filter(repoMatches).slice(0, 6)}
        onError="inline"
      >
        {(repos) => repos.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
      </ViewerSection>

      <ExploreSection
        title="Upcoming events"
        blurb="GitHub's own conferences, workshops and webinars."
        seeAll={{ tab: 'events', label: 'All events' }}
        state={settled(upcomingEvents(eventFeed.events as ResourceEvent[]))}
        limit={3}
        keep={(e) => matches(search, e.title, e.description, e.topic, e.region)}
        emptyMessage="No upcoming events in the current snapshot."
      >
        {(events) => events.map((event) => <ResourceEventCard key={event.url} event={event} />)}
      </ExploreSection>

      <ExploreSection
        title="Topics worth a detour"
        blurb="Curated by GitHub, with write-ups and related topics."
        seeAll={{ tab: 'topics', label: 'All 1200+ topics' }}
        state={{ data: feed.data?.topics ?? null, loading: feed.loading, error: feed.error }}
        limit={8}
        keep={(t) => Boolean(t.logo) &&
          matches(search, t.topic_name, t.display_name, t.short_description)}
        dense
      >
        {(topics) => topics.map((t) => <TopicCard key={t.topic_name} topic={t} />)}
      </ExploreSection>

      <ExploreSection
        title="Collections"
        blurb="Hand-picked reading lists of repositories."
        seeAll={{ tab: 'collections', label: 'All collections' }}
        state={{ data: feed.data?.collections ?? null, loading: feed.loading, error: feed.error }}
        limit={4}
        keep={(c) => matches(search, c.name, c.display_name)}
      >
        {(collections) => collections.map((c) => (
          <CollectionCard key={c.name} collection={c} largest={largestIn(collections)} />
        ))}
      </ExploreSection>

      <ExploreSection
        title="Worth sponsoring"
        blurb="Popular projects that accept funding."
        seeAll={{ tab: 'sponsors', label: 'All sponsorable projects' }}
        state={sponsorable}
        limit={3}
      >
        {(entries) => entries.map((f) => <SponsorCard key={f.repo.id} funding={f} />)}
      </ExploreSection>
    </div>
  )
}
