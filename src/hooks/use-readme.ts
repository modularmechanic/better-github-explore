import { useEffect, useState } from 'react'
import { fetchReadme, type Readme } from '@/lib/readme'
import type { Repo } from '@/types/github'

/** Loads a repository's README once `enabled` turns true. */
export function useReadme(repo: Repo, enabled: boolean) {
  const [readme, setReadme] = useState<Readme | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || readme) return
    let active = true
    setLoading(true)
    fetchReadme(repo).then((result) => {
      if (!active) return
      setReadme(result)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [enabled, repo, readme])

  return { readme, loading }
}
