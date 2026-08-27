import type { ReactNode } from 'react'
import { AsyncGrid } from '@/components/async-grid'
import { FilterSummary } from '@/components/filter-controls'
import { Pagination } from '@/components/pagination'
import type { ResultList as List } from '@/hooks/use-result-list'

interface ResultListProps<T> {
  /** From `useResultList`. The view keeps the handle so it can read `total`. */
  list: List<T>
  children: (items: T[]) => ReactNode
  /** Filters and segmented controls, laid out left of the pager. */
  controls?: ReactNode
  /** Footnote under the results. */
  summary?: ReactNode
  /** Rendered instead of the grid when a finished, error-free load found nothing. */
  empty?: ReactNode
  emptyMessage?: string
  /** Narrower cards for dense lists such as topics. */
  dense?: boolean
  skeletonCount?: number
  /** Overrides the grid's track sizing. */
  gridClassName?: string
}

/**
 * A filtered, sorted, paginated list with the chrome every list tab shares:
 * a control row with the page-size pager, the grid, a pager below it, and a
 * footnote.
 *
 * The pagination props used to be wired up twice per view, by hand, in seven
 * views — fifteen `<Pagination>` renders whose props had to agree. They agree
 * here instead.
 */
export function ResultList<T>({
  list, children, controls, summary, empty, emptyMessage, dense, skeletonCount, gridClassName,
}: ResultListProps<T>) {
  const settled = !list.state.loading && !list.state.error
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {controls}
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          onPage={list.setPage}
          pageSize={list.pageSize}
          onPageSize={list.setPageSize}
          inline
          className="ml-auto"
        />
      </div>

      {empty && settled && list.total === 0 ? (
        empty
      ) : (
        <AsyncGrid
          state={list.state}
          dense={dense}
          skeletonCount={skeletonCount}
          className={gridClassName}
          emptyMessage={emptyMessage}
        >
          {children}
        </AsyncGrid>
      )}

      <Pagination page={list.page} totalPages={list.totalPages} onPage={list.setPage} />

      {summary && <FilterSummary>{summary}</FilterSummary>}
    </div>
  )
}
