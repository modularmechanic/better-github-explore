import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { ErrorBoundary } from '@/components/error-boundary'
import { useAsync } from '@/hooks/use-async'
import { tabAllowed, useHashRoute } from '@/hooks/use-hash-route'
import { useToken } from '@/hooks/use-token'
import { loadLanguageColors } from '@/lib/language-colors'
import { CollectionDetailView } from '@/views/collection-detail-view'
import { CollectionsView } from '@/views/collections-view'
import { DiscoverView } from '@/views/discover-view'
import { EventsView } from '@/views/events-view'
import { ExploreView } from '@/views/explore-view'
import { SponsorsView } from '@/views/sponsors-view'
import { TopicDetailView } from '@/views/topic-detail-view'
import { TopicsView } from '@/views/topics-view'
import { TrendingView } from '@/views/trending-view'
import { YouView } from '@/views/you-view'

export default function App() {
  const route = useHashRoute()
  const { has, version } = useToken()
  // A bookmarked token-only tab, opened after the token is cleared, must not
  // render an empty shell. One guard for every such tab, not one per tab.
  const tab = tabAllowed(route.tab, has) ? route.tab : 'explore'
  const { param } = route
  const [search, setSearch] = useState('')

  // Colours arrive asynchronously; resolving them re-renders the cards below.
  useAsync(loadLanguageColors, [])

  // The filter box is per-view state, so reset it when the route changes.
  useEffect(() => setSearch(''), [tab, param])

  return (
    <div className="relative min-h-dvh text-foreground">
      <div className="app-backdrop" aria-hidden />

      <AppHeader tab={tab} search={search} onSearchChange={setSearch} />

      <main key={version} className="relative w-full px-3 py-5 sm:px-6">
        {/*
          Inside <main>, so a view that throws leaves the header and tab strip
          standing and the reader can navigate out of it. The reset key is the
          route, so moving to another tab clears a caught error.
        */}
        <ErrorBoundary key={`${tab}/${param ?? ''}`}>
        {tab === 'explore' && <ExploreView search={search} />}
        {tab === 'you' && <YouView search={search} />}
        {tab === 'trending' && <TrendingView search={search} />}
        {tab === 'discover' && <DiscoverView lens={param} search={search} />}
        {tab === 'topics' && (param
          ? <TopicDetailView topic={param} search={search} />
          : <TopicsView search={search} />)}
        {tab === 'collections' && (param
          ? <CollectionDetailView name={param} search={search} />
          : <CollectionsView search={search} />)}
        {tab === 'events' && <EventsView search={search} />}
        {tab === 'sponsors' && <SponsorsView search={search} />}
        </ErrorBoundary>
      </main>

      <footer className="w-full border-t px-3 py-6 text-xs text-on-glow sm:px-5">
        Live data from the GitHub REST API and the{' '}
        <a href="https://github.com/github/explore" className="underline" target="_blank" rel="noopener noreferrer">
          github/explore
        </a>{' '}
        feed. Unofficial and unaffiliated with GitHub.
      </footer>
    </div>
  )
}
