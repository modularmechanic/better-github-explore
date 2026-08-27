/**
 * The stored personal access token — the one module that knows the storage key.
 *
 * Before this existed the token had no interface. `'bx-token'` was written out
 * in two modules, five call sites read it reactively through `useToken` and
 * five read the raw value at render time, and one of those (the maintainer
 * strip) never re-rendered when it changed. Everything about the token now
 * crosses this seam: the key, the value, the notification, and the cross-tab
 * `storage` filter.
 *
 * Deliberately not React-aware. `useToken` subscribes to it; nothing here
 * imports a hook.
 */

/** Not exported: the key is not part of the interface. */
const KEY = 'bx-token'

type Listener = () => void

/**
 * Two rings, notified in order.
 *
 * Sweepers discard state that belonged to the previous token — the response
 * cache, requests already on the wire. They must all finish before any reader
 * runs, or a reader that refetches on change would read the old token's
 * responses straight back out of the cache it is about to be told to distrust.
 */
const sweepers = new Set<Listener>()
const readers = new Set<Listener>()

/**
 * Web storage, or null where there is none — a node test process, or any
 * non-browser context. No storage means no stored token, which is the same
 * answer as an anonymous visitor and needs no special case at the call sites.
 */
const storage = (): Storage | null => (typeof localStorage === 'undefined' ? null : localStorage)

/** The stored token, or an empty string when none is saved. */
export const readToken = (): string => storage()?.getItem(KEY) ?? ''

/** Whether a token is stored. The only question most callers actually have. */
export const hasToken = (): boolean => readToken() !== ''

function notify() {
  sweepers.forEach((fn) => fn())
  readers.forEach((fn) => fn())
}

/** Stores a trimmed token, or removes it when the value is blank. */
export function writeToken(token: string) {
  const value = token.trim()
  const store = storage()
  if (!store) return
  if (value) store.setItem(KEY, value)
  else store.removeItem(KEY)
  notify()
}

/**
 * Registers a sweeper. Runs before every reader on any token change, including
 * one made in another tab. See the note on the two rings above.
 */
export function onTokenSweep(fn: Listener): () => void {
  sweepers.add(fn)
  return () => {
    sweepers.delete(fn)
  }
}

/** Registers a reader. Runs after every sweeper. */
export function onTokenChange(fn: Listener): () => void {
  readers.add(fn)
  return () => {
    readers.delete(fn)
  }
}

// Another tab writing a `bx:` cache entry must not look like a token change, or
// every cached response anywhere would remount this tab's views. A null key
// means that tab called localStorage.clear(), which does take the token with it.
if (typeof addEventListener === 'function') {
  addEventListener('storage', (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) notify()
  })
}
