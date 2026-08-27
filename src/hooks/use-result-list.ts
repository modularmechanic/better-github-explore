/**
 * Filter, sort and paginate one list — the pipeline every list view runs.
 *
 * Before this existed, all seven list views re-assembled it by hand: a
 * `useState(DEFAULT_PAGE_SIZE)`, a `useMemo` filter, a `usePagination`, and
 * then an `AsyncState` forged by splicing the page onto the source's `loading`
 * and `error` (`{ ...state, data: pageItems }`, seventeen times across the
 * tree). `state` below is the honest version of that object, built once.
 *
 * Split from `<ResultList>` on purpose: five views want the standard chrome
 * that component renders, and the Trending tab runs two independent lists in a
 * split layout that it lays out itself. Both call this.
 */
import { useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/components/pagination'
import { usePagination } from '@/hooks/use-pagination'
import type { AsyncState } from '@/hooks/use-async'

export interface ResultListOptions<T> {
  /**
   * Narrows and orders the whole list in one pass. Receives a copy, so
   * sorting in place cannot reach the caller's data.
   *
   * One function rather than a `filter` plus a `sort`, because the rules in
   * `src/lib` genuinely are one pass: favourites float above whichever order
   * is selected, so the filter and the comparator cannot be separated without
   * splitting a rule in half.
   */
  select?: (items: T[]) => T[]
  /** Starting page size; the pager can change it from there. */
  pageSize?: number
  /**
   * Values `select` closes over. It is a new function identity on every
   * render, so it cannot be a dependency itself — the same contract `useAsync`
   * already uses in this codebase.
   */
  deps?: unknown[]
}

export interface ResultList<T> {
  /** Everything that survived the filter, in order — not just this page. */
  items: T[] | null
  /** How many survived. What a "N results" footnote wants. */
  total: number
  page: number
  setPage: (page: number) => void
  totalPages: number
  pageSize: number
  setPageSize: (size: number) => void
  /**
   * This page alone, carrying the source's own `loading` and `error`. Safe to
   * hand straight to `AsyncGrid` — no caller has to build one.
   */
  state: AsyncState<T[]>
}

export function useResultList<T>(
  source: AsyncState<T[]>,
  { select, pageSize: initialPageSize = DEFAULT_PAGE_SIZE, deps = [] }: ResultListOptions<T> = {},
): ResultList<T> {
  const [pageSize, setPageSize] = useState(initialPageSize)

  const items = useMemo(() => {
    if (!source.data) return null
    // The copy is what makes an in-place sort inside `select` safe — a footgun
    // three of the old views avoided by spreading first and two only by luck.
    const copy = [...source.data]
    return select ? select(copy) : copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.data, ...deps])

  const { page, setPage, totalPages, pageItems } = usePagination(items, pageSize)

  return {
    items,
    total: items?.length ?? 0,
    page,
    setPage,
    totalPages,
    pageSize,
    setPageSize,
    state: { data: pageItems, loading: source.loading, error: source.error },
  }
}
