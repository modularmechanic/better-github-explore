/**
 * Every network call the app makes.
 *
 * Responses are cached because the unauthenticated GitHub API allows only 60
 * requests/hour; a personal access token lifts that to 5000. The Explore feed
 * and raw file reads are served from GitHub Pages and raw.githubusercontent.com,
 * so they cost nothing against that budget.
 *
 * Transport and storage sit behind a seam (`Adapters`) rather than being read
 * off the global object. The interface above the seam is unchanged — callers
 * still just call `api()` — but the dedupe, TTL, quota and rate-limit rules can
 * now be exercised through that interface instead of by replacing globals the
 * interface never mentions.
 */
import type { ExploreFeed, RateLimit, Repo } from '@/types/github'
import { onTokenSweep, readToken } from '@/lib/token'

const CACHE_TTL = 30 * 60 * 1000
const CACHE_PREFIX = 'bx:'

/** The key-value half of the seam. `keys` is what a sweep needs and `Storage` lacks. */
export interface CacheStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

export interface Adapters {
  fetch: typeof fetch
  store: CacheStore
}

/**
 * Reads the platform lazily on every call. The test setup swaps
 * `globalThis.fetch` between tests, so capturing it at module load would pin
 * the first one for the whole run.
 */
const platform: Adapters = {
  fetch: (...args) => globalThis.fetch(...args),
  store: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
    keys: () => Object.keys(localStorage),
  },
}

let adapters: Adapters = platform

/**
 * Swaps what sits behind the seam and returns a restore function.
 *
 * Two adapters make the seam real: the platform pair above, and an in-memory
 * pair used by the tests that exercise caching without a DOM.
 */
export function installAdapters(next: Partial<Adapters>): () => void {
  const previous = adapters
  adapters = { ...adapters, ...next }
  return () => {
    adapters = previous
  }
}

export const rateLimit: RateLimit = { remaining: null, limit: null, reset: null }

/**
 * Requests in flight, keyed by path.
 *
 * The cache is only written once a response resolves, so two components
 * mounting in the same React commit both miss it and both fetch — which on the
 * Explore page spent two of the ten searches a minute allows on one query.
 * Sharing the promise makes concurrent identical calls cost one request.
 */
const inflight = new Map<string, Promise<unknown>>()

const rateListeners = new Set<(r: RateLimit) => void>()
export function onRateLimit(fn: (r: RateLimit) => void) {
  rateListeners.add(fn)
  return () => {
    rateListeners.delete(fn)
  }
}

/**
 * Everything cached under the previous token is discarded before any reader is
 * told the token changed — see the two rings in `lib/token`.
 *
 * Requests already on the wire belong to the old token too. Dropping them from
 * the map stops a later caller adopting one as its own: a `/user` call started
 * under the previous account would otherwise resolve into the new one's view,
 * and be cached there for half an hour.
 */
onTokenSweep(() => {
  inflight.clear()
  clearCache()
})

function clearCache() {
  adapters.store
    .keys()
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .forEach((k) => adapters.store.removeItem(k))
}

function readCache<T>(key: string): T | null {
  try {
    const raw = adapters.store.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as { t: number; v: T }
    return Date.now() - entry.t < CACHE_TTL ? entry.v : null
  } catch {
    return null // corrupt entry — treat as a miss
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    adapters.store.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }))
  } catch {
    clearCache() // quota exceeded — start over rather than fail the request
  }
}

/** GitHub REST call. `fresh` skips the cache for live endpoints. */
export async function api<T>(path: string, { fresh = false } = {}): Promise<T> {
  if (!fresh) {
    const hit = readCache<T>(path)
    if (hit) return hit
    const pending = inflight.get(path)
    if (pending) return pending as Promise<T>
  }

  const request = requestFromNetwork<T>(path, fresh)
  if (!fresh) {
    inflight.set(path, request)
    // Delete only if this promise is still the entry. A token change clears the
    // map mid-flight, so a newer request can already own this path — an
    // unconditional delete would evict it and make the next caller refetch.
    request.finally(() => {
      if (inflight.get(path) === request) inflight.delete(path)
    }).catch(() => {})
  }
  return request
}

/** The network half of `api`, split out so the in-flight map stays readable. */
async function requestFromNetwork<T>(path: string, fresh: boolean): Promise<T> {
  const token = readToken()
  const res = await adapters.fetch('https://api.github.com' + path, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const remaining = res.headers.get('x-ratelimit-remaining')
  const limitHeader = res.headers.get('x-ratelimit-limit')
  const resetHeader = res.headers.get('x-ratelimit-reset')
  // An absent header stays null rather than becoming 0: Number(null) is 0,
  // which would advertise a budget of "x/0" and a reset time in 1970.
  const resetAt = resetHeader === null ? null : Number(resetHeader) * 1000
  if (remaining !== null) {
    rateLimit.remaining = Number(remaining)
    rateLimit.limit = limitHeader === null ? null : Number(limitHeader)
    rateLimit.reset = resetAt
    rateListeners.forEach((fn) => fn({ ...rateLimit }))
  }

  if (!res.ok) {
    // One guard here beats one in every /user/* caller: GitHub's own body says
    // "Bad credentials", which does not tell the user where to fix it.
    if (res.status === 401) {
      throw new Error('GitHub rejected the token — open the key icon to replace it.')
    }
    // Judge THIS response's headers, not the shared `rateLimit`: a concurrent
    // call can overwrite the singleton before we get here and downgrade the
    // helpful message to the generic one.
    if (res.status === 403 && remaining === '0') {
      const at = resetAt ? new Date(resetAt).toLocaleTimeString() : 'soon'
      throw new Error(`Rate limit reached — resets at ${at}. Add a token for 5000 requests/hour.`)
    }
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message ?? `GitHub responded ${res.status}`)
  }

  const data = (await res.json()) as T
  // The sweep stops a stale promise being *adopted*, but one already awaited
  // here still resolves. Re-reading the token catches that second window —
  // otherwise clicking Clear mid-flight writes the signed-out account's
  // repositories, private ones included, into the swept cache.
  if (!fresh && readToken() === token) writeCache(path, data)
  return data
}

export const searchRepos = (q: string, { sort = 'stars', perPage = 30, page = 1 } = {}) =>
  api<{ items: Repo[]; total_count: number }>(
    `/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=${perPage}&page=${page}`,
  )

/** `repo:a/b repo:c/d` is OR-ed by search, so a whole collection costs one request. */
export const reposByName = (names: string[]) =>
  names.length
    ? searchRepos(names.map((n) => `repo:${n}`).join(' '), { perPage: 100 }).then((r) => r.items)
    : Promise.resolve<Repo[]>([])

/** All 111 collections and 1200+ topics behind github.com/explore, in one request. */
export async function exploreFeed(): Promise<ExploreFeed> {
  const hit = readCache<ExploreFeed>('explore-feed')
  if (hit) return hit
  const res = await adapters.fetch('https://explore-feed.github.com/feed.json')
  if (!res.ok) throw new Error('Could not load the GitHub Explore feed')
  const data = (await res.json()) as Partial<ExploreFeed>
  const feed = { topics: data.topics ?? [], collections: data.collections ?? [] }
  writeCache('explore-feed', feed)
  return feed
}

/** Raw file read, outside the API rate limit. Returns null when absent. */
export async function rawFile(path: string): Promise<string | null> {
  const key = 'raw:' + path
  const hit = readCache<string>(key)
  if (hit !== null) return hit === '\0' ? null : hit
  const res = await adapters.fetch('https://raw.githubusercontent.com/' + path)
  const text = res.ok ? await res.text() : null
  writeCache(key, text ?? '\0')
  return text
}
