// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { followingUsers, starredRepos, viewer, viewerRepos, watchedRepos } from './github-viewer'
import { rateLimit } from './github-api'
import { writeToken as setToken } from '@/lib/token'

/** Minimal stand-in for a fetch Response — only what `api` touches. */
function response(
  body: unknown,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

/** Installs a fetch stub resolving the given responses in order. */
function stubFetch(...responses: ReturnType<typeof response>[]) {
  const fn = vi.fn()
  for (const r of responses) fn.mockResolvedValueOnce(r)
  globalThis.fetch = fn as unknown as typeof fetch
  return fn
}

beforeEach(() => {
  Object.assign(rateLimit, { remaining: null, limit: null, reset: null })
})

describe('viewer endpoints', () => {
  const pub = { id: 1, full_name: 'a/b', private: false }
  const priv = { id: 2, full_name: 'a/secret', private: true }

  it('requests the documented path for each viewer read', async () => {
    const fetchMock = stubFetch(response({}), response([]), response([]), response([]))

    await viewer()
    await watchedRepos()
    await starredRepos()
    await followingUsers()

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'https://api.github.com/user',
      'https://api.github.com/user/subscriptions?per_page=100',
      'https://api.github.com/user/starred?per_page=100',
      'https://api.github.com/user/following?per_page=100',
    ])
  })

  it('drops private repositories from both watched and starred', async () => {
    // The single enforcement point: no consumer re-filters, so a private repo
    // name never reaches a card or a topic ranking. It does still sit in the
    // response cache, which api() writes before this filter runs — the token
    // itself is in localStorage beside it, so that is not the weak link.
    stubFetch(response([pub, priv]), response([priv, pub]))

    expect(await watchedRepos()).toEqual([pub])
    expect(await starredRepos()).toEqual([pub])
  })

  it('viewerRepos concatenates starred then watched, in two requests', async () => {
    const fetchMock = stubFetch(response([{ id: 1 }]), response([{ id: 2 }]))

    expect(await viewerRepos()).toEqual([{ id: 1 }, { id: 2 }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('explains a 401 as a rejected token rather than "Bad credentials"', async () => {
    stubFetch(response({ message: 'Bad credentials' }, { status: 401 }))

    await expect(viewer()).rejects.toThrow(
      'GitHub rejected the token — open the key icon to replace it.',
    )
  })

  it('setToken("") sweeps the cached viewer profile', async () => {
    // Privacy: every viewer read goes through api(), so it lands under the bx:
    // prefix that clearing the token removes. No bespoke cache key may exist.
    stubFetch(response({ login: 'octocat' }))
    await viewer()
    expect(localStorage.getItem('bx:/user')).not.toBeNull()

    setToken('')

    expect(localStorage.getItem('bx:/user')).toBeNull()
  })
})
