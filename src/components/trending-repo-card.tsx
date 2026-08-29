import { useMemo } from 'react'
import { GitFork, Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { LanguageDot } from '@/components/language-dot'
import { RepoMedia } from '@/components/repo-media'
import { OpenInDesktop } from '@/components/open-in-desktop'
import { useInView } from '@/hooks/use-in-view'
import { useReadme } from '@/hooks/use-readme'
import { compactNumber, headline } from '@/lib/format'
import type { Repo } from '@/types/github'
import type { TrendingRepo, TrendingSince } from '@/types/trending'

/** How GitHub words the window it ranked by, so the delta reads as a sentence. */
const PERIOD: Record<TrendingSince, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
}

/** At most this many "Built by" faces; GitHub itself shows five. */
const BUILT_BY = 5

/**
 * `useReadme` and `OpenInDesktop` are typed against the REST `Repo` but read
 * only `full_name` and `html_url` — both of which a trending row has. It is
 * projected onto exactly those two and cast, rather than padded into a whole
 * `Repo` whose zeroed counters and empty timestamps a later reader might
 * believe. src/types/trending.ts explains why the two shapes stay separate.
 */
const asRepo = (repo: TrendingRepo) =>
  ({
    full_name: repo.fullName,
    html_url: `https://github.com/${repo.fullName}`,
  }) as unknown as Repo

/**
 * A row of github.com/trending in the newspaper style of RepoCard.
 *
 * The kicker leads with the period delta because that — not total stars — is
 * what the page ranks by; a repository can sit at the top with a fraction of
 * the stars of the one below it. Zero is a real value here: GitHub pads narrow
 * language lists with repositories that gained nothing in the window, so it is
 * shown rather than hidden.
 */
export function TrendingRepoCard({ repo, since }: { repo: TrendingRepo; since: TrendingSince }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  // Memoised: useReadme keys its effect on this object, so a fresh one each
  // render would refetch in a loop.
  const asRest = useMemo(() => asRepo(repo), [repo])
  const { readme, settled } = useReadme(asRest, inView)

  return (
    <Card ref={ref} className="group flex flex-col gap-3 p-5 transition-colors hover:border-primary/40">
      {/* Kicker: the small all-caps line a newspaper runs above the headline. */}
      <div className="flex items-center gap-2 kicker">
        <span className="shrink-0 text-foreground">
          {repo.starsInPeriod > 0 && '+'}{repo.starsInPeriod.toLocaleString('en-US')} stars {PERIOD[since]}
        </span>
        {repo.language && <span className="truncate">· {repo.language}</span>}
        <OpenInDesktop repo={asRest} className="ml-auto shrink-0" />
      </div>

      <a
        href={`https://github.com/${repo.fullName}`}
        target="_blank"
        rel="noopener noreferrer"
        className="-mt-1 text-xl leading-tight font-semibold tracking-tight text-balance text-link underline-offset-4 hover:underline"
        title={repo.fullName}
      >
        {headline(repo.name, repo.owner)}
      </a>

      {/* Byline, with the contributors GitHub credits under "Built by". */}
      <div className="-mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="size-5 shrink-0">
          {/* github.com/<user>.png is a real endpoint and costs no API quota. */}
          <AvatarImage src={`https://github.com/${repo.owner}.png?size=96`} alt="" />
          <AvatarFallback className="text-xs">{repo.owner.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 truncate">
          by <a
            href={`https://github.com/${repo.owner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 hover:text-primary"
          >{repo.owner}</a>
        </span>
        {!!repo.builtBy.length && (
          <span className="ml-auto flex shrink-0 -space-x-1.5" title="Built by">
            {repo.builtBy.slice(0, BUILT_BY).map((avatar) => (
              <img
                key={avatar}
                src={avatar}
                alt=""
                loading="lazy"
                className="size-4 rounded-full ring-1 ring-background"
              />
            ))}
          </span>
        )}
      </div>

      <RepoMedia media={readme?.media ?? null} loading={!settled} className="h-32" />

      {repo.description && (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{repo.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5" title="Stars">
          <Star className="size-3.5 opacity-70" />
          <span className="font-mono text-foreground">{compactNumber(repo.stars)}</span>
        </span>
        <span className="flex items-center gap-1.5" title="Forks">
          <GitFork className="size-3.5 opacity-70" />
          <span className="font-mono text-foreground">{compactNumber(repo.forks)}</span>
        </span>
        <LanguageDot language={repo.language} />
      </div>
    </Card>
  )
}
