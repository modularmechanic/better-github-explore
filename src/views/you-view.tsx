import { AlertCircle } from 'lucide-react'
import { AsyncGrid, Notice } from '@/components/async-grid'
import { PageHero } from '@/components/page-hero'
import { RepoCard } from '@/components/repo-card'
import { SectionHeader } from '@/components/section-header'
import { UserCard } from '@/components/user-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAsync, type AsyncState } from '@/hooks/use-async'
import { followingUsers, starredRepos, viewer, watchedRepos } from '@/lib/github-viewer'
import { compactNumber, matches } from '@/lib/format'
import type { Owner, Repo } from '@/types/github'

/**
 * The signed-in account's own corner of the app: a profile hero plus the
 * repositories and people the viewer has signalled interest in on GitHub.
 *
 * This view only mounts once a token is stored (Phase 02 gates the You tab on
 * that), so it is safe to call the `/user/*` endpoints unconditionally on
 * mount. A cold load costs four cached requests — profile, watched, starred,
 * following — each deduped by `api()`, so remounting is free. The three lists
 * render as stacked sections rather than three further tabs: the tab strip
 * already overflows at 360px, and stacked sections are the idiom Explore
 * already established, so there is no new layout to invent.
 */
export function YouView({ search }: { search: string }) {
  const profile = useAsync(() => viewer(), [])
  const watched = useAsync(() => watchedRepos(), [])
  const starred = useAsync(() => starredRepos(), [])
  const following = useAsync(() => followingUsers(), [])

  // Three lines each, one caller apiece — a shared filter utility would be
  // pure ceremony for logic this small.
  const repos = (state: AsyncState<Repo[]>) =>
    state.data?.filter((r) => matches(search, r.full_name, r.description)) ?? null
  const people = (state: AsyncState<Owner[]>) =>
    state.data?.filter((u) => matches(search, u.login)) ?? null

  const you = profile.data

  return (
    <div className="space-y-8">
      <PageHero
        title={you?.name || you?.login || 'You'}
        blurb={you?.bio ?? 'The repositories and people you follow on GitHub.'}
      >
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarImage src={you ? `${you.avatar_url}&s=128` : undefined} alt="" />
            <AvatarFallback className="text-sm">
              {(you?.login ?? '??').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <dl className="flex gap-4 font-mono text-xs text-muted-foreground">
            <div>
              <dt className="uppercase tracking-[0.1em]">Repos</dt>
              <dd className="text-sm text-foreground">{compactNumber(you?.public_repos)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.1em]">Followers</dt>
              <dd className="text-sm text-foreground">{compactNumber(you?.followers)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.1em]">Following</dt>
              <dd className="text-sm text-foreground">{compactNumber(you?.following)}</dd>
            </div>
          </dl>
        </div>
      </PageHero>

      {profile.error && (
        <Notice icon={AlertCircle} title="Could not load your profile" detail={profile.error} />
      )}

      <section className="space-y-3">
        <SectionHeader title="Watching" blurb="Repositories you subscribed to." />
        <AsyncGrid
          state={{ ...watched, data: repos(watched) }}
          skeletonCount={6}
          emptyMessage="You are not watching any public repositories."
        >
          {(items) => items.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
        </AsyncGrid>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Starred" blurb="Repositories you starred." />
        <AsyncGrid
          state={{ ...starred, data: repos(starred) }}
          skeletonCount={6}
          emptyMessage="You have not starred any public repositories."
        >
          {(items) => items.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
        </AsyncGrid>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Following" blurb="Developers and organizations you follow." />
        <AsyncGrid
          state={{ ...following, data: people(following) }}
          dense
          skeletonCount={8}
          emptyMessage="You are not following anyone yet."
        >
          {(items) => items.map((u) => <UserCard key={u.login} user={u} />)}
        </AsyncGrid>
      </section>
    </div>
  )
}
