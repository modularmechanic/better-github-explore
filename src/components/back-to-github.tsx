import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { useToken } from '@/hooks/use-token'
import { api } from '@/lib/github-api'

/**
 * Back to GitHub itself. With a token we know whose account it is and can link
 * straight to their profile; without one, github.com lands on their dashboard
 * if they are signed in there.
 *
 * `version` is in the dependency list as well as `has`: swapping one token for
 * another leaves `has` true, and without it this would keep linking to the
 * previous account.
 */
export function BackToGitHub() {
  const { has, version } = useToken()
  const user = useAsync(
    () => (has ? api<{ login: string }>('/user') : Promise.resolve(null)),
    [has, version],
  )
  // `useAsync` keeps the previous result while the next one is in flight, so
  // reading `data` alone would go on naming — and linking to — the account the
  // token was just changed away from. Fall back to the plain GitHub link for
  // the window in between.
  const login = user.loading ? undefined : user.data?.login

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      title={login ? `Back to github.com/${login}` : 'Back to GitHub'}
      nativeButton={false}
      render={<a href={login ? `https://github.com/${login}` : 'https://github.com'} />}
    >
      <ArrowLeft />
      <span className="hidden sm:inline">{login ?? 'GitHub'}</span>
    </Button>
  )
}
