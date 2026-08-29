import { ExternalLink, GitFork, Loader2, Scale, Star, CircleDot } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { LanguageDot } from '@/components/language-dot'
import { MarkdownBody } from '@/components/markdown-body'
import { OpenInDesktop } from '@/components/open-in-desktop'
import { RepoMedia } from '@/components/repo-media'
import { useReadme } from '@/hooks/use-readme'
import { compactNumber, headline, timeAgo } from '@/lib/format'
import { navigate } from '@/hooks/use-hash-route'
import type { Repo } from '@/types/github'

/** The repository read in place — README and all — without leaving the grid. */
export function RepoQuickview({
  repo, open, onOpenChange,
}: { repo: Repo; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { readme, loading, settled } = useReadme(repo, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[85dvh] w-[min(56rem,94vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <div className="flex items-start gap-3 border-b p-5 pr-12">
          <Avatar className="size-10 rounded-lg">
            <AvatarImage src={`${repo.owner.avatar_url}&s=96`} alt="" />
            <AvatarFallback className="rounded-lg text-xs">
              {repo.owner.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-xl leading-tight tracking-tight">
              {headline(repo.name, repo.owner.login)}
            </DialogTitle>
            <p className="mb-1 font-mono text-xs text-muted-foreground">
              by {repo.owner.login} · {repo.full_name}
            </p>
            <DialogDescription className="line-clamp-2 text-sm">
              {repo.description || 'No description.'}
            </DialogDescription>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Star className="size-3.5" />{compactNumber(repo.stargazers_count)}</span>
              <span className="flex items-center gap-1.5"><GitFork className="size-3.5" />{compactNumber(repo.forks_count)}</span>
              <span className="flex items-center gap-1.5"><CircleDot className="size-3.5" />{compactNumber(repo.open_issues_count)}</span>
              <LanguageDot language={repo.language} />
              {repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' && (
                <span className="flex items-center gap-1.5"><Scale className="size-3.5" />{repo.license.spdx_id}</span>
              )}
              <span>pushed {timeAgo(repo.pushed_at)}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <OpenInDesktop repo={repo} variant="button" />
            <Button size="sm" variant="secondary" nativeButton={false} render={
              <a href={repo.html_url} target="_blank" rel="noopener noreferrer" />
            }>
              Open <ExternalLink />
            </Button>
          </div>
        </div>

        {!!repo.topics?.length && (
          <div className="flex flex-wrap gap-1.5 border-b px-5 py-3">
            {repo.topics.slice(0, 12).map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="cursor-pointer hover:border-primary hover:text-primary"
                onClick={() => {
                  onOpenChange(false)
                  navigate('topics', topic)
                }}
              >
                {topic}
              </Badge>
            ))}
          </div>
        )}

        {/* Native scrolling: the dialog body is the only scroll container. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-4 p-5">
            <RepoMedia media={readme?.media ?? null} loading={!settled} className="h-56" />
            {loading && !readme && (
              <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading README…
              </p>
            )}
            {!loading && !readme && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                This repository has no README to show.
              </p>
            )}
            {readme && <MarkdownBody markdown={readme.markdown} repo={repo} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
