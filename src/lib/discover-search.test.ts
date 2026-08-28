// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  fetchSelection, fetchSelectionResult, queryFor, requestCost,
} from './discover-search'
import { findCategory } from './discover-categories'
import { LENSES } from './discover-lenses'
import { DEFAULT_YEAR, type Selection } from './discover-selection'
import type { Repo } from '@/types/github'

const repo = (over: Partial<Repo> & { id: number }): Repo => ({
  name: `thing-${over.id}`,
  full_name: `owner/thing-${over.id}`,
  html_url: '',
  description: null,
  owner: { login: 'owner', avatar_url: '', html_url: '' },
  stargazers_count: 100,
  forks_count: 10,
  open_issues_count: 0,
  language: 'TypeScript',
  license: null,
  created_at: '2024-01-01T00:00:00Z',
  pushed_at: '2026-01-01T00:00:00Z',
  ...over,
})

/** Routes each search by the `topic:` it carries, so a union can be assembled. */
function stubByTopic(byTopic: Record<string, Repo[]>, fallback: Repo[] = []) {
  const calls: string[] = []
  globalThis.fetch = vi.fn((url: string) => {
    const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '')
    calls.push(q)
    const topic = q.match(/topic:([\w-]+)$/)?.[1]
    const items = topic ? byTopic[topic] ?? [] : fallback
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ items, total_count: items.length }),
    })
  }) as unknown as typeof fetch
  return calls
}

const select = (over: Partial<Selection> = {}): Selection =>
  ({
    lens: LENSES.fresh,
    year: DEFAULT_YEAR,
    maintained: false,
    category: null,
    topic: null,
    ...over,
  })

describe('a bare lens', () => {
  it('spends one request and asks for a full page', async () => {
    const calls = stubByTopic({}, [repo({ id: 1 })])

    await fetchSelection(select())

    expect(calls).toHaveLength(1)
    expect(calls[0]).not.toContain('topic:')
  })
})

describe('a category union', () => {
  const science = findCategory('science')!

  it('runs one search per topic in the bundle, since qualifiers cannot be OR-ed', async () => {
    const calls = stubByTopic({})

    await fetchSelection(select({ category: science }))

    expect(calls).toHaveLength(science.topics.length)
    for (const topic of science.topics) {
      expect(calls.some((q) => q.endsWith(`topic:${topic}`))).toBe(true)
    }
  })

  it('merges the slices, keeping a repository found under two topics only once', async () => {
    const shared = repo({ id: 7 })
    stubByTopic({ science: [shared], physics: [shared], astronomy: [repo({ id: 8 })] })

    const found = await fetchSelection(select({ category: science }))

    expect(found.map((r) => r.id).sort()).toEqual([7, 8])
  })

  it('re-orders the merge, rather than leaving it grouped by topic', async () => {
    // Each slice arrives sorted within itself. Concatenated, a low-starred
    // first-topic repo would outrank a high-starred one from a later topic.
    stubByTopic({
      science: [repo({ id: 1, stargazers_count: 10 })],
      physics: [repo({ id: 2, stargazers_count: 9000 })],
    })

    const found = await fetchSelection(select({ category: science }))

    expect(found.map((r) => r.id)).toEqual([2, 1])
  })

  it('orders a push-date lens by push date, not by stars', async () => {
    stubByTopic({
      science: [repo({ id: 1, stargazers_count: 9000, pushed_at: '2020-01-01T00:00:00Z' })],
      physics: [repo({ id: 2, stargazers_count: 10, pushed_at: '2026-08-01T00:00:00Z' })],
    })

    const found = await fetchSelection(select({ lens: LENSES.gold, category: science }))

    expect(found.map((r) => r.id)).toEqual([2, 1])
  })

  it('narrows to a single request when one topic is chosen', async () => {
    const calls = stubByTopic({ physics: [repo({ id: 1 })] })

    const found = await fetchSelection(select({ category: science, topic: 'physics' }))

    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('topic:physics')
    expect(found).toHaveLength(1)
  })

  it('applies the domain floor to Hidden Gems without weakening other lenses', () => {
    const ai = findCategory('ai')!
    const science = findCategory('science')!

    expect(queryFor(select({ lens: LENSES.gems, category: ai }))).toContain('stars:200..1500')
    expect(queryFor(select({ lens: LENSES.gems, category: science }))).toContain('stars:20..1500')
    expect(queryFor(select({ lens: LENSES.solid, category: science }))).toContain('stars:>10000')
  })
})

describe('curation', () => {
  it('culls reading lists from every lens, not only the ranked ones', async () => {
    for (const lens of Object.values(LENSES)) {
      stubByTopic({}, [repo({ id: 1, name: 'awesome-selfhosted', language: null }), repo({ id: 2, name: 'caddy' })])

      expect((await fetchSelection(select({ lens }))).map((r) => r.name)).toEqual(['caddy'])
    }
  })

  it('culls across a union too, not only a single query', async () => {
    stubByTopic({ science: [repo({ id: 1, name: 'awesome-science', language: null })], physics: [repo({ id: 2, name: 'root' })] })

    const found = await fetchSelection(select({ category: findCategory('science')! }))

    expect(found.map((r) => r.name)).toEqual(['root'])
  })
})

describe('a union where some topics fail', () => {
  const science = findCategory('science')!

  /** Fails the named topics, serves the rest. */
  function stubFailing(failing: string[], items: Repo[]) {
    globalThis.fetch = vi.fn((url: string) => {
      const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '')
      const topic = q.match(/topic:([\w-]+)$/)?.[1]
      if (topic && failing.includes(topic)) {
        return Promise.reject(new Error('Rate limit reached'))
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ items, total_count: items.length }),
      })
    }) as unknown as typeof fetch
  }

  it('keeps the slices that worked instead of discarding the whole category', async () => {
    // Promise.all threw away six good searches because the seventh hit a
    // rate limit, and the user saw "Something went wrong" over nothing.
    stubFailing(['physics'], [repo({ id: 1 })])

    const result = await fetchSelectionResult(select({ category: science }))

    expect(result.items).toHaveLength(1)
    expect(result.missing).toBe(1)
  })

  it('reports a whole result as missing nothing', async () => {
    stubFailing([], [repo({ id: 1 })])

    expect((await fetchSelectionResult(select({ category: science }))).missing).toBe(0)
  })

  it('still fails when every topic fails, rather than showing an empty set', async () => {
    // An empty grid would read as "this category has nothing in it".
    stubFailing(science.topics, [])

    await expect(fetchSelectionResult(select({ category: science })))
      .rejects.toThrow('Rate limit reached')
  })

  it('fails a single-topic selection the way it always did', async () => {
    stubFailing(['physics'], [])

    await expect(fetchSelectionResult(select({ category: science, topic: 'physics' })))
      .rejects.toThrow('Rate limit reached')
  })
})

describe('requestCost', () => {
  it('reports one for a lens, and one per topic for a bundle', () => {
    const crypto = findCategory('crypto')!

    expect(requestCost(select())).toBe(1)
    expect(requestCost(select({ category: crypto }))).toBe(crypto.topics.length)
    expect(requestCost(select({ category: crypto, topic: 'bitcoin' }))).toBe(1)
  })
})
