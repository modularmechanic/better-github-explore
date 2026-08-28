import { useState } from 'react'
import {
  ChevronDown, CircleDot, Eye, GitFork, Loader2, Scale, Star, TrendingUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LanguageDot } from '@/components/language-dot'
import { MarkdownBody } from '@/components/markdown-body'
import { RepoMedia } from '@/components/repo-media'
import { OpenInDesktop } from '@/components/open-in-desktop'
import { RepoQuickview } from '@/components/repo-quickview'
import { useInView } from '@/hooks/use-in-view'
import { useReadme } from '@/hooks/use-readme'
import { compactNumber, headline, starVelocity, timeAgo } from '@/lib/format'
import type { RepoBadge } from '@/lib/discover-badges'
import { navigate } from '@/hooks/use-hash-route'
import { cn } from '@/lib/utils'
import type { Repo } from '@/types/github'

/** How much README an expanded card shows before the quickview takes over. */
const PREVIEW_CHARS = 2000

function Stat({ icon: Icon, value, title }: { icon: typeof Star; value: string; title: string }) {
  return (
    <span className="flex items-center gap-1.5" title={title}>
      <Icon className="size-3.5 opacity-70" />
      <span className="font-mono text-foreground">{value}</span>
    </span>
  )
}

/**
 * `badges` is an opt-in slot rather than something the card derives: only the
 * Discover tab has anything to say here, and the six other views that render
 * this card should not grow a label they never asked for.
 */
export function RepoCard({ repo, badges = [] }: { repo: Repo; badges?: RepoBadge[] }) {
  const [expanded, setExpanded] = useState(false)
  const [quickview, setQuickview] = useState(false)
  const { ref, inView } = useInView<HTMLDivElement>()

  // The README is only fetched once the card is on screen; it supplies both the
  // media preview and the expanded excerpt.
  const { readme, loading } = useReadme(repo, inView)
  const velocity = starVelocity(repo)

  return (
    <Card ref={ref} className="group flex flex-col gap-3 p-5 transition-colors hover:border-primary/40">
      {/* Kicker: the small all-caps line a newspaper runs above the headline. */}
      <div className="flex items-center gap-2 kicker">
        <span className="truncate">{repo.language ?? 'Repository'}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {badges.map((badge) => (
            <Badge
              key={badge.label}
              variant={badge.tone === 'warn' ? 'destructive' : 'outline'}
              title={badge.title}
              className="tracking-normal"
            >
              {badge.label}
            </Badge>
          ))}
          {velocity >= 1 && (
            <Badge variant={velocity >= 50 ? 'default' : 'secondary'} className="font-mono tracking-normal">
              <TrendingUp /> {velocity >= 20 ? compactNumber(Math.round(velocity)) : velocity.toFixed(1)}/d
            </Badge>
          )}
          <OpenInDesktop repo={repo} />
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Quick look"
            onClick={() => setQuickview(true)}
          >
            <Eye />
          </Button>
        </div>
      </div>

      <a
        href={repo.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="-mt-1 text-xl leading-tight font-semibold tracking-tight text-balance text-link underline-offset-4 hover:underline"
        title={repo.full_name}
      >
        {headline(repo.name, repo.owner.login)}
      </a>

      {/* Byline */}
      <div className="-mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={`${repo.owner.avatar_url}&s=48`} alt="" />
          <AvatarFallback className="text-xs">
            {repo.owner.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 truncate">
          by <a
            href={repo.owner.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 hover:text-primary"
          >{repo.owner.login}</a>
        </span>
        <span aria-hidden>·</span>
        <span className="shrink-0" title={`Created ${timeAgo(repo.created_at)}`}>
          {timeAgo(repo.pushed_at)}
        </span>
      </div>

      {readme?.media && <RepoMedia media={readme.media} className="h-32" />}

      {repo.description && (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{repo.description}</p>
      )}

      {!!repo.topics?.length && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 3).map((topic) => (
            <Badge
              key={topic}
              variant="outline"
              className="cursor-pointer hover:border-primary hover:text-primary"
              onClick={() => navigate('topics', topic)}
            >
              {topic}
            </Badge>
          ))}
        </div>
      )}

      {expanded && (
        <div className="max-h-72 overflow-y-auto rounded-lg bg-muted p-3">
          {loading && <p className="text-sm text-muted-foreground">Loading README…</p>}
          {!loading && !readme && <p className="text-sm text-muted-foreground">No README found.</p>}
          {readme && (
            <>
              <MarkdownBody markdown={readme.markdown.slice(0, PREVIEW_CHARS)} repo={repo} />
              {readme.markdown.length > PREVIEW_CHARS && (
                <Button
                  size="sm"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setQuickview(true)}
                >
                  Read the rest in quick look →
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
        <Stat icon={Star} value={compactNumber(repo.stargazers_count)} title="Stars" />
        <Stat icon={GitFork} value={compactNumber(repo.forks_count)} title="Forks" />
        <Stat icon={CircleDot} value={compactNumber(repo.open_issues_count)} title="Open issues" />
        <LanguageDot language={repo.language} />
        {repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' && (
          <Stat icon={Scale} value={repo.license.spdx_id} title="License" />
        )}

        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 gap-1 px-1.5 text-xs text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {loading && expanded ? <Loader2 className="animate-spin" /> : null}
          README
          <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
        </Button>
      </div>

      {quickview && <RepoQuickview repo={repo} open={quickview} onOpenChange={setQuickview} />}
    </Card>
  )
}
