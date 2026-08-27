import { useCallback, useEffect, useState } from 'react'

export type FavouriteKind = 'topics' | 'collections'

const key = (kind: FavouriteKind) => `bx-favourites:${kind}`
const read = (kind: FavouriteKind): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(kind)) ?? '[]')
    // Valid JSON of the wrong shape (an object, a number) survives the catch and
    // would blow up on ids.includes(...) during render.
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** Cross-component sync: every hook instance listens for the same event. */
const CHANGED = 'bx-favourites-changed'

export function useFavourites(kind: FavouriteKind) {
  const [ids, setIds] = useState<string[]>(() => read(kind))

  useEffect(() => {
    const sync = () => setIds(read(kind))
    addEventListener(CHANGED, sync)
    addEventListener('storage', sync) // other tabs
    return () => {
      removeEventListener(CHANGED, sync)
      removeEventListener('storage', sync)
    }
  }, [kind])

  const toggle = useCallback(
    (id: string) => {
      const current = read(kind)
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
      localStorage.setItem(key(kind), JSON.stringify(next))
      dispatchEvent(new Event(CHANGED))
    },
    [kind],
  )

  return { ids, isFavourite: (id: string) => ids.includes(id), toggle, count: ids.length }
}
