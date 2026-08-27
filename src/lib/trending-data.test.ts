import { afterEach, expect, it, vi } from 'vitest'
import { loadTrendingIndex, loadTrendingSnapshot } from './trending-data'

/** Minimal stand-in for a fetch Response — only what loadJson touches. */
const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

function stubFetch(...results: unknown[]) {
  const fn = vi.fn()
  for (const r of results) fn.mockResolvedValueOnce(r)
  globalThis.fetch = fn as unknown as typeof fetch
  return fn
}

const urlOf = (fn: ReturnType<typeof vi.fn>, call = 0) => String(fn.mock.calls[call][0])

// The module caches per file forever, so each test uses a language of its own
// rather than resetting a private map.
afterEach(() => vi.unstubAllEnvs())

it('prefixes the URL with BASE_URL, so it survives the Pages sub-path', async () => {
  vi.stubEnv('BASE_URL', '/bettergithub/')
  const fetchMock = stubFetch(response({ since: 'daily', language: 'basepath' }))

  await loadTrendingSnapshot('daily', 'basepath')

  // A leading-slash "/data/..." would 404 under /<repo>/ on GitHub Pages.
  expect(urlOf(fetchMock)).toBe('/bettergithub/data/trending/daily-basepath.json')
})

it('names the file since-language, and index.json for the filter options', async () => {
  vi.stubEnv('BASE_URL', '/')
  const fetchMock = stubFetch(response({ languages: [] }), response({ since: 'monthly' }))

  await loadTrendingIndex()
  await loadTrendingSnapshot('monthly', 'cpp')

  expect(urlOf(fetchMock, 0)).toBe('/data/trending/index.json')
  // The slug is ours: GitHub's own segment for C++ is c%2B%2B, not a filename.
  expect(urlOf(fetchMock, 1)).toBe('/data/trending/monthly-cpp.json')
})

it('returns the parsed snapshot', async () => {
  const snapshot = {
    since: 'weekly', language: 'rust', capturedAt: '2026-08-26T18:00:00.000Z',
    repos: [{ fullName: 'a/b', starsInPeriod: 0 }], developers: [],
  }
  stubFetch(response(snapshot))

  await expect(loadTrendingSnapshot('weekly', 'rust')).resolves.toEqual(snapshot)
})

it('serves a repeat request from memory, costing no second request', async () => {
  const fetchMock = stubFetch(response({ language: 'cached' }))

  const first = await loadTrendingSnapshot('daily', 'cached')
  const second = await loadTrendingSnapshot('daily', 'cached')

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(second).toBe(first)
})

it('reports a missing snapshot instead of parsing the 404 page', async () => {
  stubFetch(response('<!doctype html>', 404))

  await expect(loadTrendingSnapshot('daily', 'missing')).rejects.toThrow(/HTTP 404/)
})

it('does not cache a failure, so the next attempt retries', async () => {
  const fetchMock = stubFetch(response(null, 500), response({ language: 'flaky' }))

  await expect(loadTrendingSnapshot('daily', 'flaky')).rejects.toThrow()
  await expect(loadTrendingSnapshot('daily', 'flaky')).resolves.toEqual({ language: 'flaky' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
