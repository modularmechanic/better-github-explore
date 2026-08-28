// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  api,
  exploreFeed,
  onRateLimit,
  rateLimit,
  rawFile,
  reposByName,
  searchRepos,
} from './github-api'
import { onTokenChange, readToken, writeToken as setToken } from '@/lib/token'

const CACHE_KEY = 'bx:/repos/a/b'
const TOKEN_KEY = 'bx-token'

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

const headersOf = (fn: ReturnType<typeof vi.fn>, call = 0) =>
  (fn.mock.calls[call][1] as RequestInit).headers as Record<string, string>

beforeEach(() => {
  // Module-level singleton: reset so tests don't leak rate-limit state.
  Object.assign(rateLimit, { remaining: null, limit: null, reset: null })
})

describe('cache', () => {
  it('fetches on a miss, stores the result, and serves the next call from cache', async () => {
    const fetchMock = stubFetch(response({ id: 1 }))

    expect(await api('/repos/a/b')).toEqual({ id: 1 })
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).v).toEqual({ id: 1 })

    expect(await api('/repos/a/b')).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refetches an entry older than the 30 minute TTL', async () => {
    const stale = Date.now() - 31 * 60 * 1000
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: stale, v: { id: 'old' } }))
    const fetchMock = stubFetch(response({ id: 'new' }))

    expect(await api('/repos/a/b')).toEqual({ id: 'new' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats a corrupt cache entry as a miss instead of throwing', async () => {
    localStorage.setItem(CACHE_KEY, '{not json')
    const fetchMock = stubFetch(response({ id: 1 }))

    expect(await api('/repos/a/b')).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fresh:true skips both the cache read and the cache write', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v: { id: 'cached' } }))
    const fetchMock = stubFetch(response({ id: 'live' }))

    expect(await api('/repos/a/b', { fresh: true })).toEqual({ id: 'live' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // Untouched: the live result must not poison the cached entry.
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).v).toEqual({ id: 'cached' })
  })
})

describe('token', () => {
  it('sends no Authorization header when no token is stored', async () => {
    const fetchMock = stubFetch(response({}))
    await api('/repos/a/b')
    expect(headersOf(fetchMock)).not.toHaveProperty('Authorization')
  })

  it('sends the stored token as a bearer header', async () => {
    localStorage.setItem(TOKEN_KEY, 'ghp_x')
    const fetchMock = stubFetch(response({}))
    await api('/repos/a/b')
    expect(headersOf(fetchMock).Authorization).toBe('Bearer ghp_x')
  })

  it('writeToken stores a trimmed token and clears the cache', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v: 1 }))
    setToken('  ghp_x  ')
    expect(readToken()).toBe('ghp_x')
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })

  it('writeToken("") removes the key and clears the cache', () => {
    localStorage.setItem(TOKEN_KEY, 'ghp_x')
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v: 1 }))
    setToken('')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })
})

describe('rate limit reporting', () => {
  const rateHeaders = {
    'x-ratelimit-remaining': '42',
    'x-ratelimit-limit': '60',
    'x-ratelimit-reset': '1700000000',
  }

  it('updates the rateLimit object and notifies subscribers', async () => {
    const seen = vi.fn()
    const off = onRateLimit(seen)
    stubFetch(response({}, { headers: rateHeaders }))

    await api('/repos/a/b')

    expect(rateLimit).toEqual({ remaining: 42, limit: 60, reset: 1700000000000 })
    expect(seen).toHaveBeenCalledWith({ remaining: 42, limit: 60, reset: 1700000000000 })
    off()
  })

  it('stops notifying after the returned unsubscribe runs', async () => {
    const seen = vi.fn()
    onRateLimit(seen)()
    stubFetch(response({}, { headers: rateHeaders }))

    await api('/repos/a/b')

    expect(seen).not.toHaveBeenCalled()
  })
})

describe('errors', () => {
  const exhausted = { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1700000000' }
  const resetAt = new Date(1700000000000).toLocaleTimeString()

  it('explains an exhausted rate limit, with the reset time', async () => {
    stubFetch(response({ message: 'API rate limit exceeded' }, { status: 403, headers: exhausted }))

    await expect(api('/repos/a/b')).rejects.toThrow(
      `Rate limit reached — resets at ${resetAt}. Add a token for 5000 requests/hour.`,
    )
  })

  it('keeps the rate-limit message when a concurrent call overwrites the singleton', async () => {
    // A listener standing in for a successful response landing mid-flight: it
    // mutates the shared rateLimit between this response's headers and the 403
    // branch. Reading the singleton there would downgrade to the generic message.
    const off = onRateLimit(() => {
      Object.assign(rateLimit, { remaining: 59, limit: 60, reset: 0 })
    })
    stubFetch(response({ message: 'API rate limit exceeded' }, { status: 403, headers: exhausted }))

    await expect(api('/repos/a/b')).rejects.toThrow(`Rate limit reached — resets at ${resetAt}`)
    off()
  })

  it('uses the generic message for a 403 that is not a rate limit', async () => {
    stubFetch(
      response(
        { message: 'Repository access blocked' },
        { status: 403, headers: { 'x-ratelimit-remaining': '58' } },
      ),
    )

    await expect(api('/repos/a/b')).rejects.toThrow('Repository access blocked')
  })

  it('throws the message from the body of a non-403 failure', async () => {
    stubFetch(response({ message: 'Not Found' }, { status: 404 }))
    await expect(api('/repos/a/b')).rejects.toThrow('Not Found')
  })

  it('falls back to the status code when the error body has no message', async () => {
    stubFetch(response({}, { status: 500 }))
    await expect(api('/repos/a/b')).rejects.toThrow('GitHub responded 500')
  })

  it('does not cache a failed response', async () => {
    stubFetch(response({ message: 'Not Found' }, { status: 404 }))
    await expect(api('/repos/a/b')).rejects.toThrow()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })
})

describe('cache writes that cannot be stored', () => {
  it('empties the cache instead of failing the request when the quota is exceeded', async () => {
    localStorage.setItem('bx:/other', JSON.stringify({ t: Date.now(), v: 'evict me' }))
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    stubFetch(response({ id: 1 }))

    expect(await api('/repos/a/b')).toEqual({ id: 1 })
    // The old entries are gone, so the next write has room.
    expect(localStorage.getItem('bx:/other')).toBeNull()
    setItem.mockRestore()
  })

  it('retries the current response after evicting older entries', async () => {
    localStorage.setItem('bx:/other', JSON.stringify({ t: Date.now(), v: 'evict me' }))
    const original = Storage.prototype.setItem
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      .mockImplementation(function (this: Storage, key, value) {
        return original.call(this, key, value)
      })
    stubFetch(response({ id: 2 }))

    expect(await api('/repos/a/b')).toEqual({ id: 2 })
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).v).toEqual({ id: 2 })
    expect(localStorage.getItem('bx:/other')).toBeNull()
    setItem.mockRestore()
  })
})

describe('error bodies that are not JSON', () => {
  it('falls back to the status code when the error body will not parse', async () => {
    const broken = {
      ...response({}, { status: 502 }),
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON')
      },
    }
    stubFetch(broken)

    await expect(api('/repos/a/b')).rejects.toThrow('GitHub responded 502')
  })

  it('says "soon" when an exhausted response carries no reset time', async () => {
    stubFetch(response({}, { status: 403, headers: { 'x-ratelimit-remaining': '0' } }))

    await expect(api('/repos/a/b')).rejects.toThrow('Rate limit reached — resets at soon.')
  })
})

describe('searchRepos', () => {
  it('encodes the query and passes paging through', async () => {
    const fetchMock = stubFetch(response({ items: [], total_count: 0 }))

    await searchRepos('stars:>1 language:"C++"', { sort: 'updated', perPage: 50, page: 2 })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.github.com/search/repositories?q=stars%3A%3E1%20language%3A%22C%2B%2B%22' +
        '&sort=updated&order=desc&per_page=50&page=2',
    )
  })



  it('compacts GitHub search items before returning and caching them', async () => {
    const item = {
      id: 1,
      name: 'tool',
      full_name: 'owner/tool',
      html_url: 'https://github.com/owner/tool',
      description: null,
      owner: { login: 'owner', avatar_url: '', html_url: '', type: 'User', noisy_owner_field: 'drop' },
      stargazers_count: 10,
      forks_count: 2,
      open_issues_count: 1,
      language: 'TypeScript',
      topics: ['tool'],
      license: null,
      created_at: '2025-01-01T00:00:00Z',
      pushed_at: '2026-01-01T00:00:00Z',
      noisy_search_field: 'drop',
    }
    stubFetch(response({ items: [item], total_count: 1, incomplete_results: false }))

    const found = await searchRepos('repo:owner/tool')
    const key = Object.keys(localStorage).find((candidate) => candidate.includes('repo%3Aowner%2Ftool'))!
    const stored = localStorage.getItem(key)!

    expect(found.items[0]).not.toHaveProperty('noisy_search_field')
    expect(found.items[0].owner).not.toHaveProperty('noisy_owner_field')
    expect(stored).not.toContain('noisy_search_field')
    expect(stored).not.toContain('noisy_owner_field')
  })
})

describe('reposByName', () => {
  it('OR-s every name into a single search request', async () => {
    const item = {
      id: 1,
      name: 'b',
      full_name: 'a/b',
      html_url: 'https://github.com/a/b',
      description: null,
      owner: { login: 'a', avatar_url: '', html_url: '' },
      stargazers_count: 1,
      forks_count: 0,
      open_issues_count: 0,
      language: null,
      license: null,
      created_at: '2025-01-01T00:00:00Z',
      pushed_at: '2026-01-01T00:00:00Z',
    }
    const fetchMock = stubFetch(response({ items: [item], total_count: 1 }))

    expect(await reposByName(['a/b', 'c/d'])).toEqual([expect.objectContaining({ id: 1 })])
    expect(fetchMock.mock.calls[0][0]).toContain(encodeURIComponent('repo:a/b repo:c/d'))
  })

  it('spends no request on an empty collection', async () => {
    const fetchMock = stubFetch()

    expect(await reposByName([])).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('exploreFeed', () => {
  const FEED_KEY = 'bx:explore-feed'
  const FEED_MARKER = 'bx:explore-feed-memory'

  it('fetches the feed and caches it in memory without consuming API-cache quota', async () => {
    const feed = { topics: [{ topic_name: 'react' }], collections: [{ name: 'dev-tools' }] }
    const fetchMock = stubFetch(response(feed))

    expect(await exploreFeed()).toEqual(feed)
    expect(await exploreFeed()).toEqual(feed)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://explore-feed.github.com/feed.json')
    expect(localStorage.getItem(FEED_KEY)).toBeNull()
    expect(localStorage.getItem(FEED_MARKER)).not.toBeNull()
  })

  it('migrates a previously persisted feed without a request', async () => {
    const feed = { topics: [], collections: [] }
    localStorage.setItem(FEED_KEY, JSON.stringify({ t: Date.now(), v: feed }))
    const fetchMock = stubFetch()

    expect(await exploreFeed()).toEqual(feed)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorage.getItem(FEED_KEY)).toBeNull()
    expect(localStorage.getItem(FEED_MARKER)).not.toBeNull()
  })

  it('defaults missing sections to empty arrays rather than undefined', async () => {
    stubFetch(response({}))

    expect(await exploreFeed()).toEqual({ topics: [], collections: [] })
  })

  it('throws a readable error when the feed is unavailable', async () => {
    stubFetch(response({}, { status: 500 }))

    await expect(exploreFeed()).rejects.toThrow('Could not load the GitHub Explore feed')
  })
})

describe('rawFile', () => {
  const KEY = 'bx:raw:a/b/HEAD/FUNDING.yml'
  const PATH = 'a/b/HEAD/FUNDING.yml'

  it('returns the file body and caches it', async () => {
    const fetchMock = stubFetch({ ...response(null), text: async () => 'github: octocat' })

    expect(await rawFile(PATH)).toBe('github: octocat')
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://raw.githubusercontent.com/' + PATH,
    )
    expect(JSON.parse(localStorage.getItem(KEY)!).v).toBe('github: octocat')
  })

  it('serves a cached body without a request', async () => {
    localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: 'cached' }))
    const fetchMock = stubFetch()

    expect(await rawFile(PATH)).toBe('cached')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null for a missing file and remembers the absence', async () => {
    stubFetch(response({}, { status: 404 }))

    expect(await rawFile(PATH)).toBeNull()
    // A tombstone, not an empty string: "no file" must survive the cache round trip.
    expect(JSON.parse(localStorage.getItem(KEY)!).v).toBe('\0')
  })

  it('spends no request re-checking a file already known to be missing', async () => {
    localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: '\0' }))
    const fetchMock = stubFetch()

    expect(await rawFile(PATH)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('in-flight deduplication', () => {
  it('shares one request between concurrent identical calls', async () => {
    // Two components mounting in the same commit both miss the cache, because
    // it is only written once a response resolves.
    const fetchMock = stubFetch(response({ id: 1 }))

    const [a, b] = await Promise.all([api('/repos/x/y'), api('/repos/x/y')])

    expect(a).toEqual(b)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not leave a failed request stuck in the map', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('network down'))
    globalThis.fetch = failing as unknown as typeof fetch
    await expect(api('/repos/x/fails')).rejects.toThrow('network down')

    // A second attempt must actually retry rather than replay the rejection.
    const recovered = stubFetch(response({ id: 2 }))
    await expect(api('/repos/x/fails')).resolves.toEqual({ id: 2 })
    expect(recovered).toHaveBeenCalledTimes(1)
  })
})

describe('token changes mid-flight', () => {
  it('does not serve the previous token\'s in-flight response to the next one', async () => {
    // Switching accounts while a /user call is on the wire: without
    // inflight.clear() the second api() adopts the first promise and renders
    // account A under account B's token.
    let resolveA: (r: unknown) => void = () => {}
    const fetchMock = vi.fn()
    fetchMock.mockReturnValueOnce(new Promise((r) => { resolveA = r }))
    fetchMock.mockResolvedValueOnce(response({ login: 'account-B' }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    setToken('ghp_a')
    const first = api<{ login: string }>('/user')

    setToken('ghp_b')
    const second = api<{ login: string }>('/user')

    resolveA(response({ login: 'account-A' }))
    await first.catch(() => {})

    expect(await second).toEqual({ login: 'account-B' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('a settling request does not evict a newer in-flight request for the same path', async () => {
    // setToken clears the map mid-flight, so request B can own the path while
    // A is still settling. An unconditional delete evicted B, and the next
    // caller then started a third request instead of sharing B.
    let resolveA: (r: unknown) => void = () => {}
    const fetchMock = vi.fn()
    fetchMock.mockReturnValueOnce(new Promise((r) => { resolveA = r }))
    fetchMock.mockReturnValueOnce(new Promise(() => {})) // B stays pending
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const a = api('/repos/a/b')
    setToken('ghp_b')            // clears the map; A is still in flight
    api('/repos/a/b')            // B takes the path

    resolveA(response({ id: 'A' }))
    await a

    api('/repos/a/b')            // should share B, not fetch again
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache a response that resolves after the token changed', async () => {
    // Clear pressed mid-flight: the old request still resolves, and writing it
    // would repopulate the swept cache with the signed-out account's repos.
    let resolve: (r: unknown) => void = () => {}
    globalThis.fetch = vi.fn(() => new Promise((r) => { resolve = r })) as unknown as typeof fetch

    setToken('ghp_a')
    const pending = api<unknown[]>('/user/subscriptions?per_page=100')

    setToken('')
    resolve(response([{ id: 1, full_name: 'me/secret', private: true }]))
    await pending.catch(() => {})

    expect(localStorage.getItem('bx:/user/subscriptions?per_page=100')).toBeNull()
  })

  it('wakes readers only after the cache sweep has already run', () => {
    // The ordering github-api relies on: its sweeper is registered on the
    // sweeper ring, so a reader that refetches cannot read the previous
    // token's responses back out of the cache.
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v: 1 }))
    let cacheWhenWoken: string | null = 'not woken'
    const off = onTokenChange(() => {
      cacheWhenWoken = localStorage.getItem(CACHE_KEY)
    })

    setToken('ghp_x')

    expect(cacheWhenWoken).toBeNull()
    off()
  })
})
