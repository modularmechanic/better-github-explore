/**
 * The seam under `github-api`, exercised through its own interface.
 *
 * Deliberately NOT `@vitest-environment jsdom`. Every other test of this module
 * reaches around it — replacing `globalThis.fetch` and leaning on jsdom's
 * `localStorage` — which is testing past the interface. These run in plain node
 * with an in-memory store and a scripted transport injected at the seam, which
 * is the second adapter that makes the seam real rather than hypothetical.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { api, exploreFeed, rawFile, installAdapters, type CacheStore } from './github-api'

/** A `CacheStore` backed by a Map. The whole point: no DOM. */
function memoryStore(): CacheStore & { size: () => number } {
  const entries = new Map<string, string>()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
    keys: () => [...entries.keys()],
    size: () => entries.size,
  }
}

function response(
  body: unknown,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response
}

/** Serves the given responses in order, and counts the calls. */
function scripted(...queue: Response[]) {
  const calls: string[] = []
  const fetch = ((url: string) => {
    calls.push(url)
    const next = queue.shift()
    if (!next) throw new Error(`unscripted request: ${url}`)
    return Promise.resolve(next)
  }) as unknown as typeof globalThis.fetch
  return { fetch, calls }
}

let restore: (() => void) | null = null
afterEach(() => {
  restore?.()
  restore = null
})

/** Installs both adapters and returns the handles the assertions need. */
function withAdapters(...queue: Response[]) {
  const store = memoryStore()
  const transport = scripted(...queue)
  restore = installAdapters({ fetch: transport.fetch, store })
  return { store, calls: transport.calls }
}

describe('the injected store', () => {
  it('serves a second identical call without a second request', async () => {
    const { calls } = withAdapters(response({ id: 1 }))

    expect(await api('/repos/a/b')).toEqual({ id: 1 })
    expect(await api('/repos/a/b')).toEqual({ id: 1 })

    expect(calls).toEqual(['https://api.github.com/repos/a/b'])
  })

  it('writes the response under the bx: prefix a sweep looks for', async () => {
    const { store } = withAdapters(response({ id: 1 }))

    await api('/repos/a/b')

    expect(store.keys()).toEqual(['bx:/repos/a/b'])
  })

  it('refetches once the entry is past the 30 minute TTL', async () => {
    const { store, calls } = withAdapters(response({ id: 'new' }))
    store.setItem(
      'bx:/repos/a/b',
      JSON.stringify({ t: Date.now() - 31 * 60 * 1000, v: { id: 'old' } }),
    )

    expect(await api('/repos/a/b')).toEqual({ id: 'new' })
    expect(calls).toHaveLength(1)
  })

  it('empties the cache rather than failing the request when the store is full', async () => {
    const store = memoryStore()
    const transport = scripted(response({ id: 1 }))
    store.setItem('bx:/old', 'x')
    const full: CacheStore = {
      ...store,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    restore = installAdapters({ fetch: transport.fetch, store: full })

    // The request still resolves, and the sweep took the old entry with it.
    expect(await api('/repos/a/b')).toEqual({ id: 1 })
    expect(store.keys()).toEqual([])
  })

  it('treats a corrupt entry as a miss instead of throwing', async () => {
    const { store, calls } = withAdapters(response({ id: 1 }))
    store.setItem('bx:/repos/a/b', '{not json')

    expect(await api('/repos/a/b')).toEqual({ id: 1 })
    expect(calls).toHaveLength(1)
  })
})

describe('the injected transport', () => {
  it('sends no Authorization header when no token is readable', async () => {
    const store = memoryStore()
    let sent: HeadersInit | undefined
    const fetch = ((_url: string, init: RequestInit) => {
      sent = init.headers
      return Promise.resolve(response({}))
    }) as unknown as typeof globalThis.fetch
    restore = installAdapters({ fetch, store })

    await api('/repos/a/b')

    expect(sent).not.toHaveProperty('Authorization')
  })

  it('caches an absent raw file so the miss is not re-checked', async () => {
    const { calls } = withAdapters(response('', { status: 404 }))

    expect(await rawFile('a/b/main/FUNDING.yml')).toBeNull()
    expect(await rawFile('a/b/main/FUNDING.yml')).toBeNull()

    expect(calls).toHaveLength(1)
  })

  it('defaults missing feed sections to empty arrays rather than undefined', async () => {
    withAdapters(response({}))

    expect(await exploreFeed()).toEqual({ topics: [], collections: [] })
  })
})

describe('restoring', () => {
  it('puts the previous adapters back', async () => {
    const first = withAdapters(response({ id: 1 }))
    await api('/repos/restore-check')
    expect(first.calls).toHaveLength(1)

    restore?.()
    restore = null

    // Back on the platform adapter, whose fetch is the setup guard: reaching
    // the network now throws rather than silently succeeding.
    await expect(api('/repos/restore-check-2')).rejects.toThrow()
  })
})
