/**
 * The Explore watchlist digest: what moved in the repositories the viewer
 * watches.
 *
 * Lived inside the section component. `pushed_at` is nullable on GitHub's
 * minimal-repository schema, and the empty-string fallback has to sort last —
 * a rule with no test until it had an interface.
 */
import { matches } from '@/lib/format'
import type { Repo } from '@/types/github'

/**
 * Watched repositories, most recently pushed first.
 *
 * A missing `pushed_at` becomes an empty string, which compares below every
 * real ISO timestamp — so undated repositories fall to the bottom rather than
 * jumping to the top.
 */
export function recentlyPushed(
  repos: Repo[],
  { search = '', limit = 6 }: { search?: string; limit?: number } = {},
): Repo[] {
  return repos
    .filter((repo) => matches(search, repo.full_name, repo.description))
    .sort((a, b) => (b.pushed_at ?? '').localeCompare(a.pushed_at ?? ''))
    .slice(0, limit)
}
