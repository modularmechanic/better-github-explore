import { RepoCard } from '@/components/repo-card'
import { ViewerSection } from '@/components/viewer-section'
import { watchedRepos } from '@/lib/github-viewer'
import { recentlyPushed } from '@/lib/watchlist'

/**
 * "From your watchlist": the viewer's watched repositories, most recently
 * pushed first, capped at six — a digest of what moved, not a copy of the You
 * tab's full list.
 *
 * `onError` is the standard notice here rather than silence: a stored token
 * GitHub rejects has to say so somewhere, and this section is the first thing
 * on the front page that reads `/user/*`. `ViewerTopicsSection` deliberately
 * stays silent on the same failure — one copy of that message is enough.
 */
export function ExploreWatchlist({ search }: { search: string }) {
  return (
    <ViewerSection
      title="From your watchlist"
      blurb="Repositories you follow, most recently pushed first."
      seeAll={{ tab: 'you', label: 'Everything you follow' }}
      load={watchedRepos}
      select={(repos) => recentlyPushed(repos, { search, limit: 6 })}
      skeletonCount={6}
    >
      {(repos) => repos.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
    </ViewerSection>
  )
}
