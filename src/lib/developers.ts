/**
 * GitHub's trending-developers page has no API behind it either. This derives
 * the same idea from repositories already fetched: whoever owns the trending
 * repositories is who is trending, ranked by their combined momentum. Costs no
 * extra requests.
 */
import { starVelocity } from './format.ts'
import type { Repo } from '@/types/github'

export interface Developer {
  login: string
  avatarUrl: string
  htmlUrl: string
  isOrganization: boolean
  /** Their repositories inside the current result set, most-starred first. */
  repos: Repo[]
  stars: number
  velocity: number
  topRepo: Repo
}

export function developersFrom(repos: Repo[]): Developer[] {
  const byLogin = new Map<string, Repo[]>()
  for (const repo of repos) {
    const existing = byLogin.get(repo.owner.login)
    if (existing) existing.push(repo)
    else byLogin.set(repo.owner.login, [repo])
  }

  return [...byLogin.values()]
    .map((owned) => {
      const sorted = [...owned].sort((a, b) => b.stargazers_count - a.stargazers_count)
      return {
        login: sorted[0].owner.login,
        avatarUrl: sorted[0].owner.avatar_url,
        htmlUrl: sorted[0].owner.html_url,
        isOrganization: sorted[0].owner.type === 'Organization',
        repos: sorted,
        stars: sorted.reduce((total, r) => total + r.stargazers_count, 0),
        velocity: sorted.reduce((total, r) => total + starVelocity(r), 0),
        topRepo: sorted[0],
      }
    })
    .sort((a, b) => b.velocity - a.velocity)
}
