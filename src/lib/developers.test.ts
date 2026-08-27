import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { developersFrom } from '@/lib/developers'
import type { Repo } from '@/types/github'

// Exactly ten days between creation and "now", so velocity is stars/10 flat.
const NOW = new Date('2024-01-11T00:00:00Z')
const CREATED = '2024-01-01T00:00:00Z'

function repo(fullName: string, stars: number, type = 'User'): Repo {
  const [login, name] = fullName.split('/')
  return {
    id: stars,
    name,
    full_name: fullName,
    html_url: `https://github.com/${fullName}`,
    description: null,
    owner: {
      login,
      avatar_url: `https://avatars.test/${login}.png`,
      html_url: `https://github.com/${login}`,
      type,
    },
    stargazers_count: stars,
    forks_count: 0,
    open_issues_count: 0,
    language: null,
    license: null,
    created_at: CREATED,
    pushed_at: CREATED,
  }
}

// acme wins on combined velocity (80/day) even though solo owns the single
// most-starred repository (70/day) — the whole point of the ranking.
const ALPHA = repo('acme/alpha', 300, 'Organization')
const BETA = repo('acme/beta', 500, 'Organization')
const GAMMA = repo('solo/gamma', 700)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('developersFrom', () => {
  it('returns an empty list for no repositories', () => {
    expect(developersFrom([])).toEqual([])
  })

  it('groups repositories by owner', () => {
    const developers = developersFrom([ALPHA, GAMMA, BETA])

    expect(developers).toHaveLength(2)
    expect(developers.map((d) => d.login).sort()).toEqual(['acme', 'solo'])
    expect(developers.find((d) => d.login === 'acme')?.repos).toHaveLength(2)
  })

  it('ranks people by combined stars per day, not by their best repository', () => {
    const [first, second] = developersFrom([ALPHA, GAMMA, BETA])

    expect(first.login).toBe('acme')
    expect(first.velocity).toBeCloseTo(80)
    expect(first.stars).toBe(800)
    expect(second.login).toBe('solo')
    expect(second.velocity).toBeCloseTo(70)
  })

  it('orders each persons repositories most-starred first', () => {
    // Input order is deliberately the weaker repository first.
    const [acme] = developersFrom([ALPHA, BETA, GAMMA])

    expect(acme.repos.map((r) => r.name)).toEqual(['beta', 'alpha'])
    expect(acme.topRepo.name).toBe('beta')
  })

  it('carries the owner identity and organization flag', () => {
    const developers = developersFrom([ALPHA, GAMMA])
    const acme = developers.find((d) => d.login === 'acme')!
    const solo = developers.find((d) => d.login === 'solo')!

    expect(acme.isOrganization).toBe(true)
    expect(acme.avatarUrl).toBe('https://avatars.test/acme.png')
    expect(acme.htmlUrl).toBe('https://github.com/acme')
    expect(solo.isOrganization).toBe(false)
  })

  it('treats a missing owner type as a person', () => {
    const anon = repo('ghost/repo', 10)
    delete anon.owner.type

    expect(developersFrom([anon])[0].isOrganization).toBe(false)
  })
})
