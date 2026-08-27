import { Building2, Star, TrendingUp, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { LanguageDot } from '@/components/language-dot'
import { OpenInDesktop } from '@/components/open-in-desktop'
import { compactNumber, headline } from '@/lib/format'
import type { Developer } from '@/lib/developers'

/** A person or organisation behind the trending repositories, with their best work. */
export function DeveloperCard({ developer }: { developer: Developer }) {
  const { topRepo, repos } = developer
  const Icon = developer.isOrganization ? Building2 : User

  return (
    <Card className="flex flex-col gap-3 p-5 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-2 kicker">
        <Icon className="size-3.5" />
        <span>{developer.isOrganization ? 'Organization' : 'Developer'}</span>
        <Badge variant="secondary" className="ml-auto font-mono tracking-normal">
          <TrendingUp /> {developer.velocity >= 10
            ? compactNumber(Math.round(developer.velocity))
            : developer.velocity.toFixed(1)}/d
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="size-12 rounded-xl">
          <AvatarImage src={`${developer.avatarUrl}&s=128`} alt="" />
          <AvatarFallback className="rounded-xl text-sm">
            {developer.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <a
            href={developer.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-2xl leading-tight font-semibold tracking-tight text-link underline-offset-4 hover:underline"
          >
            {developer.login}
          </a>
          <p className="text-xs text-muted-foreground">
            {repos.length} trending {repos.length === 1 ? 'repository' : 'repositories'} ·{' '}
            <span className="font-mono">{compactNumber(developer.stars)}</span> stars
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-lg bg-muted p-3">
        <p className="mb-1 kicker">
          Their hottest repository
        </p>
        <a
          href={topRepo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-link hover:underline"
        >
          {headline(topRepo.name, topRepo.owner.login)}
        </a>
        {topRepo.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{topRepo.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Star className="size-3.5 opacity-70" />
            <span className="text-foreground">{compactNumber(topRepo.stargazers_count)}</span>
          </span>
          <LanguageDot language={topRepo.language} />
          <OpenInDesktop repo={topRepo} className="ml-auto -my-1" />
        </div>
      </div>

      {repos.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {repos.slice(1, 4).map((repo) => (
            <Badge key={repo.id} variant="outline" className="max-w-full" render={
              <a href={repo.html_url} target="_blank" rel="noopener noreferrer" />
            }>
              <span className="truncate">{repo.name}</span>
            </Badge>
          ))}
        </div>
      )}
    </Card>
  )
}
