import { MonitorDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Repo } from '@/types/github'

/**
 * GitHub Desktop registers the `x-github-client` protocol; this is the same
 * URL the "Open with GitHub Desktop" button on github.com uses. Browsers that
 * have no handler simply do nothing, so it degrades quietly.
 */
export const desktopUrl = (repo: Repo) =>
  `x-github-client://openRepo/${repo.html_url}`

export function OpenInDesktop({
  repo, variant = 'icon', className,
}: { repo: Repo; variant?: 'icon' | 'button'; className?: string }) {
  const label = 'Open in GitHub Desktop'

  if (variant === 'button') {
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn('shrink-0', className)}
        title={label}
        nativeButton={false}
        render={<a href={desktopUrl(repo)} />}
      >
        <MonitorDown /> Desktop
      </Button>
    )
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn('size-7 text-muted-foreground hover:text-foreground', className)}
      title={label}
      aria-label={label}
      nativeButton={false}
      render={<a href={desktopUrl(repo)} />}
    >
      <MonitorDown />
    </Button>
  )
}
