import { useEffect, useState } from 'react'

export const TABS = ['explore', 'you', 'trending', 'topics', 'collections', 'events', 'sponsors'] as const
export type Tab = (typeof TABS)[number]

/** Tabs that exist only while a token is stored. */
const TOKEN_ONLY: readonly Tab[] = ['you']

/** The tab strip for the current auth state. Hidden tabs are not rendered at all. */
export const visibleTabs = (hasToken: boolean): readonly Tab[] =>
  hasToken ? TABS : TABS.filter((tab) => !TOKEN_ONLY.includes(tab))

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
