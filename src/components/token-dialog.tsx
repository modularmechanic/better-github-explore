import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { readToken, writeToken } from '@/lib/token'

/**
 * A read-only personal access token raises the API budget from 60 to 5000
 * requests/hour and unlocks the personalised You tab (watched, starred and
 * followed repos). It stays in this browser's localStorage and is sent only
 * to api.github.com.
 */
export function TokenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [value, setValue] = useState(readToken())

  // The dialog stays mounted, so the initialiser runs once. Another tab could
  // have changed the token since; without this, Save would write a stale value
  // back over the newer one.
  useEffect(() => {
    if (open) setValue(readToken())
  }, [open])

  const save = () => {
    // An unchanged value is a no-op, not a reason to sweep the cache and
    // remount every view — opening the dialog to look at the token and
    // pressing Save would otherwise refetch the whole page.
    if (value.trim() === readToken()) return onOpenChange(false)
    writeToken(value)    // sweeps the response cache, then wakes every reader
    onOpenChange(false)  // the app re-reads under the new limit without a reload
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GitHub access token</DialogTitle>
          <DialogDescription>
            Optional. Without one GitHub allows 60 requests/hour; with one, 5000 — and the You tab
            (your watched, starred and followed repos) becomes available. A token with no scopes is
            enough. It is stored in this browser only and sent only to api.github.com.
          </DialogDescription>
        </DialogHeader>

        {/* Pre-filled generator, scopes left blank: a classic PAT with no scopes is assumed to
            cover /user, /user/subscriptions, /user/starred and /user/following. Unverified —
            see plans/260827-1426-pat-personalized-tabs/phase-06-token-dialog-and-readme.md. */}
        <Button
          variant="outline"
          className="w-full justify-between"
          nativeButton={false}
          render={
            <a
              href="https://github.com/settings/tokens/new?description=Better%20GitHub%20Explore&scopes="
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Create a token on GitHub <ExternalLink />
        </Button>

        <Input
          type="password"
          autoComplete="off"
          placeholder="ghp_…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setValue(''); writeToken(''); onOpenChange(false) }}>
            Clear
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
