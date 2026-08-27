import { describe, expect, it } from 'vitest'
import { recentlyPushed } from './watchlist'
import type { Repo } from '@/types/github'

const repo = (name: string, pushedAt: string | null, description: string | null = null): Repo =>
  ({ id: name.length, full_name: `owner/${name}`, name, description, pushed_at: pushedAt }) as Repo

const names = (repos: Repo[]) => repos.map((r) => r.name)

describe('recentlyPushed', () => {
  it('orders by push date, newest first', () => {
    const repos = [
      repo('old', '2025-01-01T00:00:00Z'),
      repo('new', '2026-08-01T00:00:00Z'),
      repo('mid', '2026-01-01T00:00:00Z'),
    ]

    expect(names(recentlyPushed(repos))).toEqual(['new', 'mid', 'old'])
  })

  it('sorts a repository with no push date last, not first', () => {
    // `pushed_at` is nullable on the minimal-repository schema. The empty
    // string compares below every real ISO timestamp, which is the point.
    const repos = [repo('undated', null), repo('dated', '2026-01-01T00:00:00Z')]

    expect(names(recentlyPushed(repos))).toEqual(['dated', 'undated'])
  })

  it('filters on name and description before ordering', () => {
    const repos = [
      repo('alpha', '2026-08-01T00:00:00Z'),
      repo('beta', '2026-09-01T00:00:00Z', 'about alpha things'),
    ]

    expect(names(recentlyPushed(repos, { search: 'alpha' }))).toEqual(['beta', 'alpha'])
  })

  it('caps the digest at the limit', () => {
    const repos = Array.from({ length: 10 }, (_, i) => repo(`r${i}`, `2026-01-0${(i % 9) + 1}`))

    expect(recentlyPushed(repos, { limit: 3 })).toHaveLength(3)
  })

  it('does not reorder the array it was given', () => {
    const input = [repo('old', '2025-01-01T00:00:00Z'), repo('new', '2026-08-01T00:00:00Z')]

    recentlyPushed(input)

    expect(names(input)).toEqual(['old', 'new'])
  })
})
