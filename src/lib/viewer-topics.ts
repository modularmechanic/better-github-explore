/**
 * Derives which topics the viewer is into from the repositories they starred
 * or watch.
 *
 * GitHub exposes no "topics I follow" endpoint (research/verification-01-live-api-probes.md),
 * but `topics` already rides along in the `/user/starred` and
 * `/user/subscriptions` list payloads — so the ranking costs zero extra
 * requests. Pure on purpose: no `api()`, no React, nothing to mock.
 */
import type { Repo } from '@/types/github'

/** A topic, and how many of the viewer's repositories carry it. */
export interface ViewerTopic {
  name: string
  count: number
}

/**
 * Topics ranked by how many *distinct* viewer repositories carry them.
 *
 * Deduping by `repo.id` first is the correctness point: the starred and watched
 * sets overlap heavily, and a repository in both would otherwise count twice.
 * `min` defaults to 2 because a topic seen on one repository is noise, not an
 * interest — the caller renders nothing rather than a one-item shell.
 * Ties sort by name so the order is stable between renders.
 */
export function viewerTopics(
  repos: Repo[],
  { min = 2, limit = 12 }: { min?: number; limit?: number } = {},
): ViewerTopic[] {
  const counts = new Map<string, number>()
  const seen = new Set<number>()

  for (const repo of repos) {
    if (seen.has(repo.id)) continue
    seen.add(repo.id)
    for (const name of repo.topics ?? []) counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return [...counts]
    .filter(([, count]) => count >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}
