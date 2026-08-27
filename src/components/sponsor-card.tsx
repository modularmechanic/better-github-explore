import { useState } from 'react'
import { ExternalLink, Eye, GitFork, Heart, Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LanguageDot } from '@/components/language-dot'
import { OpenInDesktop } from '@/components/open-in-desktop'
import { RepoMedia } from '@/components/repo-media'
import { RepoQuickview } from '@/components/repo-quickview'
import { useInView } from '@/hooks/use-in-view'
import { useReadme } from '@/hooks/use-readme'
import { compactNumber, headline, timeAgo } from '@/lib/format'
import { platformLabel } from '@/lib/sponsorable'
import { navigate } from '@/hooks/use-hash-route'
import type { Funding } from '@/types/github'

export function SponsorCard({ funding }: { funding: Funding }) {
  const { repo, githubLogins, external } = funding
  const [quickview, setQuickview] = useState(false)
  const { ref, inView } = useInView<HTMLDivElement>()
  const { readme } = useReadme(repo, inView)

  return (
    <Card ref={ref} className="group flex flex-col gap-3 p-5 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-2 kicker">
        <Heart className="size-3.5 text-pink-500" />
        <span>{githubLogins.length ? 'GitHub Sponsors' : 'Accepts funding'}</span>
        <div className="ml-auto flex items-center gap-1">
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
        className="-mt-1 text-2xl leading-tight font-semibold tracking-tight text-balance text-link underline-offset-4 hover:underline"
      >
        {headline(repo.name, repo.owner.login)}
      </a>

      <div className="-mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="size-5">
          <AvatarImage src={`${repo.owner.avatar_url}&s=48`} alt="" />
          <AvatarFallback className="text-xs">{repo.owner.login.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="truncate">
          by <a
            href={repo.owner.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 hover:text-primary"
          >{repo.owner.login}</a>
        </span>
        <span aria-hidden>·</span>
        <span className="truncate">updated {timeAgo(repo.pushed_at)}</span>
      </div>

      {readme?.media && <RepoMedia media={readme.media} className="h-36" />}

      {repo.description && (
        <p className="line-clamp-2 text-base leading-relaxed text-muted-foreground">{repo.description}</p>
      )}

      {!!repo.topics?.length && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 4).map((topic) => (
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Star className="size-3.5 opacity-70" />
          <span className="font-mono text-foreground">{compactNumber(repo.stargazers_count)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <GitFork className="size-3.5 opacity-70" />
          <span className="font-mono text-foreground">{compactNumber(repo.forks_count)}</span>
        </span>
        <LanguageDot language={repo.language} />
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5 border-t pt-3">
        {githubLogins.map((login) => (
          <Button key={login} size="sm" className="h-7 text-xs" nativeButton={false} render={
            <a href={`https://github.com/sponsors/${login}`} target="_blank" rel="noopener noreferrer" />
          }>
            <Heart /> Sponsor {login}
          </Button>
        ))}
        {external.map((e) => (
          <Badge key={e.platform + e.url} variant="outline" className="h-7 px-2" render={
            <a href={e.url} target="_blank" rel="noopener noreferrer" />
          }>
            {platformLabel(e.platform, e.url)} <ExternalLink />
          </Badge>
        ))}
      </div>

      {quickview && <RepoQuickview repo={repo} open={quickview} onOpenChange={setQuickview} />}
    </Card>
  )
}
