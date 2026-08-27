import { beforeEach, describe, expect, it, vi } from 'vitest'

const FALLBACK = '#8b97a8'
const SOURCE = 'https://raw.githubusercontent.com/ozh/github-colors/master/colors.json'

/**
 * The module caches colours in a singleton, so every test needs a fresh copy —
 * otherwise the first successful load would satisfy all the others.
 */
async function freshModule() {
  vi.resetModules()
  return import('./language-colors')
}

const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('loadLanguageColors', () => {
  it('maps the dataset, substituting the fallback for a null colour', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ Rust: { color: '#dea584' }, Ada: { color: null } }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { loadLanguageColors } = await freshModule()

    expect(await loadLanguageColors()).toEqual({ Rust: '#dea584', Ada: FALLBACK })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(SOURCE)
  })

  it('serves the second call from memory instead of refetching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ Go: { color: '#00ADD8' } }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { loadLanguageColors } = await freshModule()
    await loadLanguageColors()
    await loadLanguageColors()

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('returns no colours when the dataset responds with an error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false)) as unknown as typeof fetch

    const { loadLanguageColors } = await freshModule()

    expect(await loadLanguageColors()).toEqual({})
  })

  it('swallows a network failure rather than breaking the page', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch

    const { loadLanguageColors } = await freshModule()

    await expect(loadLanguageColors()).resolves.toEqual({})
  })
})

describe('languageColor', () => {
  it('returns the loaded colour for a known language', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ Rust: { color: '#dea584' } })) as unknown as typeof fetch

    const { languageColor, loadLanguageColors } = await freshModule()
    await loadLanguageColors()

    expect(languageColor('Rust')).toBe('#dea584')
  })

  it('falls back to grey for an unknown, null, or undefined language', async () => {
    const { languageColor } = await freshModule()

    expect(languageColor('Malbolge')).toBe(FALLBACK)
    expect(languageColor(null)).toBe(FALLBACK)
    expect(languageColor(undefined)).toBe(FALLBACK)
  })
})
