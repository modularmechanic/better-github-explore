import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { breakoutBuckets, languageMix, topMovers } from '@/lib/explore-stats'
import type { Repo } from '@/types/github'

const NOW = new Date('2024-03-10T12:00:00Z')

let nextId = 1

function repo(over: Partial<Repo> = {}): Repo {
  const id = nextId++
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`,
    html_url: `https://github.com/owner/repo-${id}`,
    description: null,
    owner: { login: 'owner', avatar_url: '', html_url: '' },
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    language: null,
    license: null,
    created_at: '2024-03-10T00:00:00Z',
    pushed_at: '2024-03-10T00:00:00Z',
    ...over,
  }
}

const inLanguages = (...languages: (string | null)[]) =>
  languages.map((language) => repo({ language }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('languageMix', () => {
  it('counts repositories per language, most common first', () => {
    const mix = languageMix(inLanguages('Rust', 'Go', 'Rust', 'Rust', 'Go'))

    expect(mix.map((s) => [s.label, s.value])).toEqual([
      ['Rust', 3],
      ['Go', 2],
    ])
  })

  it('labels a missing language as Unknown', () => {
    const mix = languageMix(inLanguages(null, null, 'Rust'))

    expect(mix.find((s) => s.label === 'Unknown')?.value).toBe(2)
  })

  it('folds everything past the cut-off into a single Other slice', () => {
    const mix = languageMix(inLanguages('Rust', 'Rust', 'Go', 'Zig', 'Nim', 'Elm'), 2)

    expect(mix.map((s) => s.label)).toEqual(['Rust', 'Go', 'Other'])
    expect(mix.at(-1)?.value).toBe(3) // Zig + Nim + Elm.
  })

  it('never emits more than max + 1 slices', () => {
    const many = inLanguages(...Array.from({ length: 20 }, (_, i) => `Lang${i}`))

    expect(languageMix(many, 3)).toHaveLength(4)
    expect(languageMix(many, 6)).toHaveLength(7)
  })

  it('omits Other when every language already fits', () => {
    const mix = languageMix(inLanguages('Rust', 'Go'), 6)

    expect(mix).toHaveLength(2)
    expect(mix.some((s) => s.label === 'Other')).toBe(false)
  })

  it('returns nothing for no repositories', () => {
    expect(languageMix([])).toEqual([])
  })
})

describe('topMovers', () => {
  // Same "now", different ages: the giant has the most stars but the slowest
  // climb, which is exactly the case ranking by raw stars would get wrong.
  const giant = repo({ name: 'giant', stargazers_count: 1000, created_at: '2023-12-01T12:00:00Z' })
  const rocket = repo({ name: 'rocket', stargazers_count: 300, created_at: '2024-02-29T12:00:00Z' })
  const steady = repo({ name: 'steady', stargazers_count: 200, created_at: '2024-02-29T12:00:00Z' })

  it('ranks by stars per day rather than by stars', () => {
    const movers = topMovers([giant, steady, rocket])

    expect(movers.map((s) => s.label)).toEqual(['rocket', 'steady', 'giant'])
    expect(movers.map((s) => s.value)).toEqual([30, 20, 10])
  })

  it('respects the limit', () => {
    expect(topMovers([giant, steady, rocket], 2).map((s) => s.label)).toEqual(['rocket', 'steady'])
    expect(topMovers([giant, steady, rocket], 0)).toEqual([])
  })

  it('leaves the input array untouched', () => {
    const repos = [giant, steady, rocket]
    topMovers(repos)

    expect(repos.map((r) => r.name)).toEqual(['giant', 'steady', 'rocket'])
  })
})

describe('breakoutBuckets', () => {
  it('sizes the window: 8 three-hour blocks, 7 days, or 6 five-day blocks', () => {
    expect(breakoutBuckets([], 'day')).toHaveLength(8)
    expect(breakoutBuckets([], 'week')).toHaveLength(7)
    expect(breakoutBuckets([], 'month')).toHaveLength(6)
  })

  it('counts a repository into the block it was created in', () => {
    const repos = [
      repo({ created_at: '2024-03-10T11:00:00Z' }), // Last block of every window.
      repo({ created_at: '2024-03-10T02:00:00Z' }), // An earlier block of the day.
    ]

    const day = breakoutBuckets(repos, 'day')
    expect(day.at(-1)?.value).toBe(1)
    expect(day.slice(0, -1).reduce((total, b) => total + b.value, 0)).toBe(1)
  })

  it('never drops a repository: the columns always add up to the set', () => {
    // GitHub's `created:>YYYY-MM-DD` cuts at a UTC midnight, so the result set
    // reaches further back than the bucket span. Those repositories belong in
    // the first column, not nowhere — otherwise the chart contradicts the tile
    // above it, which counts the whole set.
    const repos = [
      repo({ created_at: '2024-03-10T11:00:00Z' }),
      repo({ created_at: '2024-03-03T04:00:00Z' }), // Older than 7 * 24h.
      repo({ created_at: '2023-01-01T00:00:00Z' }), // Far older still.
    ]

    for (const window of ['day', 'week', 'month'] as const) {
      const buckets = breakoutBuckets(repos, window)
      expect(buckets.reduce((total, b) => total + b.value, 0)).toBe(repos.length)
    }
  })

  it('accepts an explicit now instead of the clock', () => {
    const repos = [repo({ created_at: '2024-03-09T06:00:00Z' })]

    // Yesterday relative to NOW, so the bucket it lands in moves with `now`.
    expect(breakoutBuckets(repos, 'week', Date.parse('2024-03-09T12:00:00Z')).at(-1)?.value).toBe(1)
    expect(breakoutBuckets(repos, 'week').at(-1)?.value).toBe(0)
  })
})
