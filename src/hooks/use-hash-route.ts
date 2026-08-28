import { useEffect, useState } from 'react'

export const TABS = [
  'explore', 'you', 'trending', 'discover', 'topics', 'collections', 'events', 'sponsors',
] as const
export type Tab = (typeof TABS)[number]

/**
 * Tabs that exist only while a token is stored.
 *
 * `you` reads the viewer's own account, so it cannot work without one.
 * `discover` could — a lens costs one search — but is gated deliberately; the
 * reasoning is in docs/adr/0001-discover-is-token-gated-and-always-live.md.
 */
const TOKEN_ONLY: readonly Tab[] = ['you', 'discover']

/** Whether a tab may render at all in the current auth state. */
export const tabAllowed = (tab: Tab, hasToken: boolean): boolean =>
  hasToken || !TOKEN_ONLY.includes(tab)

/** The tab strip for the current auth state. Hidden tabs are not rendered at all. */
export const visibleTabs = (hasToken: boolean): readonly Tab[] =>
  TABS.filter((tab) => tabAllowed(tab, hasToken))

export interface Route {
  tab: Tab
  /** Detail segment, e.g. the topic or collection slug in `#/topics/react`. */
  param: string | null
}

/** Pure so route parsing is testable without touching `location`. */
export function parseHash(hash: string): Route {
  const [tab, param] = hash.replace(/^#\/?/, '').split('/')
  return {
    tab: (TABS as readonly string[]).includes(tab) ? (tab as Tab) : 'explore',
    param: param ? decode(param) : null,
  }
}

// A malformed escape (`%E0%A4%A`) throws URIError; a blank page is a worse
// answer than the raw segment.
function decode(param: string): string {
  try {
    return decodeURIComponent(param)
  } catch {
    return param
  }
}

const parse = (): Route => parseHash(location.hash)

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const onChange = () => setRoute(parse())
    addEventListener('hashchange', onChange)
    return () => removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const navigate = (tab: Tab, param?: string) => {
  location.hash = `#/${tab}${param ? '/' + encodeURIComponent(param) : ''}`
}
