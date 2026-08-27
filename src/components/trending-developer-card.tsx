import { User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { headline } from '@/lib/format'
import type { TrendingDeveloper } from '@/types/trending'

/**
 * A row of github.com/trending/developers, in the shape of DeveloperCard.
 *
 * Thinner than its search-derived sibling by necessity: the page publishes a
 * person, their display name and one highlighted repository — no star counts,
 * no repository list, and no way to tell a user from an organisation — so
 * there is nothing honest to put where those live on the other card.
 */
export function TrendingDeveloperCard({ developer }: { developer: TrendingDeveloper }) {
  const { login, name, popularRepo } = developer

  return (
    <Card className="flex flex-col gap-3 p-5 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-2 kicker">
        <User className="size-3.5" />
        <span>Developer</span>
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="size-12 rounded-xl">
          <AvatarImage src={developer.avatar} alt="" />
          <AvatarFallback className="rounded-xl text-sm">{login.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <a
            href={`https://github.com/${login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-2xl leading-tight font-semibold tracking-tight text-link underline-offset-4 hover:underline"
          >
            {login}
          </a>
          {name && <p className="truncate text-xs text-muted-foreground">{name}</p>}
        </div>
      </div>

      {popularRepo && (
        <div className="mt-auto rounded-lg bg-muted p-3">
          <p className="mb-1 kicker">
            Popular repository
          </p>
          <a
            href={`https://github.com/${login}/${popularRepo.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-link hover:underline"
          >
            {headline(popularRepo.name, login)}
          </a>
          {/* GitHub truncates these itself, ellipsis included — not our clamp. */}
          {popularRepo.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{popularRepo.description}</p>
          )}
        </div>
      )}
    </Card>
  )
}
