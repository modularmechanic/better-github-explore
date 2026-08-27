import { useEffect, useMemo, useState } from 'react'

/**
 * Client-side paging for lists already held in memory (topics, collections,
 * events). Server-paged lists pass their page straight to the API instead.
 */
export function usePagination<T>(items: T[] | null, pageSize: number) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil((items?.length ?? 0) / pageSize))

  // A changed filter can leave the current page beyond the end of the list.
  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const pageItems = useMemo(
    () => (items ? items.slice((page - 1) * pageSize, page * pageSize) : null),
    [items, page, pageSize],
  )

  return { page, setPage, totalPages, pageItems }
}
