import { Building2, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import type { Owner } from '@/types/github'

/**
 * A followed account, from the plain `Owner` shape `/user/following` returns.
 *
 * This is not a smaller `DeveloperCard`: that card needs `topRepo`/`repos`/
 * `velocity` derived from trending search results, none of which exist for a
 * followed user, and a per-user request to fetch them would blow the section's
 * request budget. So this renders only what GitHub actually gives us — avatar,
 * login, and whether the account is a person or an organization.
 */
export function UserCard({ user }: { user: Owner }) {
  const isOrg = user.type === 'Organization'
  const Icon = isOrg ? Building2 : User

  return (
    <Card className="flex flex-row items-center gap-3 p-4 transition-colors hover:border-primary/40">
      <Avatar className="size-12 rounded-xl">
        <AvatarImage src={`${user.avatar_url}&s=128`} alt="" />
        <AvatarFallback className="rounded-xl text-sm">
          {user.login.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <a
          href={user.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-base font-semibold tracking-tight text-link underline-offset-4 hover:underline"
        >
          {user.login}
        </a>
        <p className="flex items-center gap-1.5 text-[10.5px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {isOrg ? 'Organization' : 'Developer'}
        </p>
      </div>
    </Card>
  )
}
