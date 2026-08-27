/**
 * Whether a personal access token is stored, as reactive state.
 *
 * Deliberately never returns the token string: nothing outside `lib/token` and
 * `github-api` needs it, and a value that cannot reach a render tree, a React
 * `key` or a log line is one that cannot leak at all.
 *
 * Everything else — the storage key, the cross-tab `storage` filter, the order
 * the cache sweep runs in — lives behind `lib/token`. This hook is the React
 * adapter for it and nothing more.
 */
import { useEffect, useState } from 'react'
import { hasToken, onTokenChange } from '@/lib/token'

/**
 * `has` gates the You tab; `version` bumps on every change so a view can remount
 * itself with a `key` and drop data fetched under the previous token. It bumps
 * even when `has` is unchanged, because swapping one token for another is also
 * a reason to drop everything fetched under the old one.
 */
export function useToken(): { has: boolean; version: number } {
  const [state, setState] = useState(() => ({ has: hasToken(), version: 0 }))

  useEffect(
    () => onTokenChange(() => setState((prev) => ({ has: hasToken(), version: prev.version + 1 }))),
    [],
  )

  return state
}
