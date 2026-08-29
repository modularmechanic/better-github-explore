import { useEffect, useState } from 'react'
import { fetchReadme, type Readme } from '@/lib/readme'
import type { Repo } from '@/types/github'

/**
 * Loads a repository's README once `enabled` turns true.
 *
 * `settled` exists because `readme === null` is two different answers — "not
 * asked yet" and "asked, there is none" — and `loading` cannot tell them apart
 * either: it is false in both, since the effect that raises it runs after the
 * first paint. A caller reserving space for README-derived content therefore
 * has no way to know, on the render that matters, whether anything is coming.
 * `settled` is that signal: false until an answer exists, true once one does.
 */
export function useReadme(repo: Repo, enabled: boolean) {
  const [readme, setReadme] = useState<Readme | null>(null)
  const [loading, setLoading] = useState(false)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (!enabled || readme) return
    let active = true
    setLoading(true)
    fetchReadme(repo).then((result) => {
      if (!active) return
      setReadme(result)
      setLoading(false)
      // A null result is an answer too: this repository has no README, and the
      // space held for one can be given back.
      setSettled(true)
    })
    return () => {
      active = false
    }
  }, [enabled, repo, readme])

  return { readme, loading, settled }
}
