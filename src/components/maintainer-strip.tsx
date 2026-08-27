import { Heart } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ViewerSection } from '@/components/viewer-section'
import { compactNumber } from '@/lib/format'
import { findMaintainers, sponsorableFirst, type Maintainer } from '@/lib/maintainers'

/** How many cards the strip shows. The rest of the scan informs the blurb only. */
const SHOWN = 8

/**
 * The people who contribute to your own repositories, and which of them accept
 * sponsorship — the most directly actionable thing this tab can show, since
 * these are projects you already depend on.
 *
 * Hidden entirely without a token: it reads your repositories, and only GraphQL
 * knows who has GitHub Sponsors set up, which refuses anonymous requests. That
 * gate used to be `Boolean(getToken())` read at render, so saving a token never
 * re-rendered this section — only the whole-app remount rescued it. It now
 * crosses the same seam as every other reader.
 */
function MaintainerCard({ maintainer }: { maintainer: Maintainer }) {
  const { login, avatarUrl, contributions, repos, sponsorable } = maintainer

  return (
    <Card className="flex flex-col gap-3 p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3">
        <Avatar className="size-10 rounded-xl">
          <AvatarImage src={`${avatarUrl}&s=96`} alt="" />
          <AvatarFallback className="rounded-xl text-xs">{login.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <a
            href={`https://github.com/${login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-semibold tracking-tight text-link underline-offset-4 hover:underline"
          >
            {login}
          </a>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{compactNumber(contributions)}</span> commits to{' '}
            {repos.length === 1 ? repos[0] : `${repos.length} of your repositories`}
          </p>
        </div>
        {sponsorable && <Heart className="size-4 shrink-0 fill-pink-500 text-pink-500" />}
      </div>

      {repos.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {repos.slice(0, 3).map((repo) => (
            <Badge key={repo} variant="outline" className="max-w-full">
              <span className="truncate">{repo}</span>
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-auto border-t pt-3">
        {sponsorable ? (
          <Button size="sm" className="h-7 w-full text-xs" nativeButton={false} render={
            <a href={`https://github.com/sponsors/${login}`} target="_blank" rel="noopener noreferrer" />
          }>
            <Heart /> Sponsor {login}
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {sponsorable === false ? 'No sponsors profile' : 'Sponsorship unknown'}
          </p>
        )}
      </div>
    </Card>
  )
}

export function MaintainerStrip() {
  return (
    <ViewerSection
      title="People behind your code"
      // Counts the whole scan, not the eight cards below — how many people the
      // strip is drawn from is the more useful number.
      blurb={(all) =>
        `${all.length} contributors across your repositories · ` +
        `${all.filter((m) => m.sponsorable).length} accept sponsorship`
      }
      // `findMaintainers` returns null only without a token, which this section
      // already gates on.
      load={() => findMaintainers().then((m) => sponsorableFirst(m ?? []))}
      onError="inline"
      skeletonCount={4}
      className="grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]"
    >
      {(all) => all.slice(0, SHOWN).map((m) => <MaintainerCard key={m.login} maintainer={m} />)}
    </ViewerSection>
  )
}
