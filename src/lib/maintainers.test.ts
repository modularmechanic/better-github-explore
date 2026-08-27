// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findMaintainers, sponsorableFirst, type Maintainer } from '@/lib/maintainers'
import { writeToken as setToken } from '@/lib/token'

/** Minimal shapes: only the fields findMaintainers actually reads. */
const repo = (fullName: string, over: Record<string, unknown> = {}) => ({
  full_name: fullName,
  name: fullName.split('/')[1],
  owner: { login: fullName.split('/')[0] },
  ...over,
})
const contributor = (login: string, contributions: number, type = 'User') => ({
  login, contributions, type, avatar_url: `https://avatars/${login}`,
})

const json = (body: unknown) => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  json: async () => body,
})

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  setToken('')
  localStorage.clear()
})

describe('findMaintainers', () => {
  it('returns null without a token, so the section can stay hidden', async () => {
    expect(await findMaintainers()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sums contributions across repositories and ranks by them', async () => {
    setToken('t')
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo('me/a'), repo('me/b')]))
      if (url.includes('/repos/me/a/')) return Promise.resolve(json([contributor('ann', 10), contributor('bob', 3)]))
      if (url.includes('/repos/me/b/')) return Promise.resolve(json([contributor('ann', 5)]))
      return Promise.resolve(json({ data: {} }))
    })

    const result = await findMaintainers()

    expect(result?.map((m) => [m.login, m.contributions])).toEqual([['ann', 15], ['bob', 3]])
    expect(result?.[0].repos).toEqual(['a', 'b'])
  })

  it('skips bots, which would otherwise top the list', async () => {
    setToken('t')
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo('me/a')]))
      if (url.includes('/contributors')) {
        return Promise.resolve(json([contributor('dependabot[bot]', 900, 'Bot'), contributor('ann', 2)]))
      }
      return Promise.resolve(json({ data: {} }))
    })

    const result = await findMaintainers()

    expect(result?.map((m) => m.login)).toEqual(['ann'])
  })

  it('marks who accepts sponsorship from the single GraphQL call', async () => {
    setToken('t')
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo('me/a')]))
      if (url.includes('/contributors')) return Promise.resolve(json([contributor('ann', 5), contributor('bob', 1)]))
      return Promise.resolve(json({
        data: {
          u0: { login: 'ann', hasSponsorsListing: true },
          u1: { login: 'bob', hasSponsorsListing: false },
        },
      }))
    })

    const result = await findMaintainers()

    expect(result?.find((m) => m.login === 'ann')?.sponsorable).toBe(true)
    expect(result?.find((m) => m.login === 'bob')?.sponsorable).toBe(false)
    // One GraphQL request for every maintainer, not one each.
    const graphql = fetchMock.mock.calls.filter(([url]) => String(url).includes('/graphql'))
    expect(graphql).toHaveLength(1)
  })

  it('keeps the list when GraphQL fails, just without sponsorability', async () => {
    setToken('t')
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo('me/a')]))
      if (url.includes('/contributors')) return Promise.resolve(json([contributor('ann', 5)]))
      return Promise.resolve({ ok: false, status: 401, headers: new Headers(), json: async () => ({}) })
    })

    const result = await findMaintainers()

    expect(result?.map((m) => m.login)).toEqual(['ann'])
    expect(result?.[0].sponsorable).toBeNull()
  })

  it('survives a repository whose contributors cannot be read', async () => {
    setToken('t')
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo('me/empty'), repo('me/a')]))
      if (url.includes('/repos/me/empty/')) {
        return Promise.resolve({ ok: false, status: 204, headers: new Headers(), json: async () => ({}) })
      }
      if (url.includes('/repos/me/a/')) return Promise.resolve(json([contributor('ann', 4)]))
      return Promise.resolve(json({ data: {} }))
    })

    const result = await findMaintainers()

    expect(result?.map((m) => m.login)).toEqual(['ann'])
  })
})

describe('sponsorable batching', () => {
  it('resolves every maintainer, not just the first batch', async () => {
    setToken('t')
    // 180 contributors: more than one GraphQL document should carry.
    const many = Array.from({ length: 180 }, (_, i) => contributor(`dev${i}`, 180 - i))
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo('me/a')]))
      if (url.includes('/contributors')) return Promise.resolve(json(many))
      // Answer whatever logins this particular document asked about.
      const body = String((init as { body?: string })?.body ?? '')
      const logins = [...body.matchAll(/login: \\"([^\\"]+)/g)].map((m) => m[1])
      return Promise.resolve(json({
        data: Object.fromEntries(
          logins.map((login, i) => [`u${i}`, { login, hasSponsorsListing: true }]),
        ),
      }))
    })

    const result = await findMaintainers()

    expect(result).toHaveLength(180)
    // Every one answered — truncating at the batch size left the tail unknown.
    expect(result?.filter((m) => m.sponsorable === true)).toHaveLength(180)
    const graphql = fetchMock.mock.calls.filter(([url]) => String(url).includes('/graphql'))
    expect(graphql.length).toBeGreaterThan(1)
  })
})

describe('what counts as your code', () => {
  it('skips forks, whose contributors belong to the upstream project', async () => {
    setToken('t')
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/user/repos')) {
        return Promise.resolve(json([repo('me/fork-of-react', { fork: true }), repo('me/mine')]))
      }
      if (url.includes('/repos/me/fork-of-react/')) {
        return Promise.resolve(json([contributor('gaearon', 9000)]))
      }
      if (url.includes('/repos/me/mine/')) return Promise.resolve(json([contributor('ann', 3)]))
      return Promise.resolve(json({ data: {} }))
    })

    const result = await findMaintainers()

    // gaearon contributes to React, not to anything of yours.
    expect(result?.map((m) => m.login)).toEqual(['ann'])
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('fork-of-react'))).toBe(false)
  })

  it('excludes you from your own maintainer list', async () => {
    setToken('t')
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo('me/mine')]))
      if (url.includes('/contributors')) {
        return Promise.resolve(json([contributor('me', 500), contributor('ann', 2)]))
      }
      return Promise.resolve(json({ data: {} }))
    })

    const result = await findMaintainers()

    expect(result?.map((m) => m.login)).toEqual(['ann'])
  })
})

describe('sponsorableFirst', () => {
  const person = (login: string, sponsorable: boolean | null): Maintainer => ({
    login, avatarUrl: '', contributions: 0, repos: [], sponsorable,
  })

  it('puts everyone who accepts sponsorship first', () => {
    const ordered = sponsorableFirst([person('a', false), person('b', true)])

    expect(ordered.map((m) => m.login)).toEqual(['b', 'a'])
  })

  it('keeps the contribution order inside each half', () => {
    const ordered = sponsorableFirst([
      person('top', true), person('mid', false), person('also', true), person('low', false),
    ])

    expect(ordered.map((m) => m.login)).toEqual(['top', 'also', 'mid', 'low'])
  })

  it('treats unknown sponsorability as not sponsorable, not as a third group', () => {
    const ordered = sponsorableFirst([person('unknown', null), person('yes', true)])

    expect(ordered.map((m) => m.login)).toEqual(['yes', 'unknown'])
  })

  it('does not reorder the array it was given', () => {
    const input = [person('a', false), person('b', true)]

    sponsorableFirst(input)

    expect(input.map((m) => m.login)).toEqual(['a', 'b'])
  })
})
