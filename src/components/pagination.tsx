import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterSelect, type Option } from '@/components/filter-controls'
import { cn } from '@/lib/utils'

export const PAGE_SIZES = [15, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25

const SIZE_OPTIONS: Option<string>[] = PAGE_SIZES.map((size) => ({
  value: String(size),
  label: `${size} per page`,
}))

/** Prev/next pager shared by every list in the app. */
export function Pagination({
  page, totalPages, onPage, className, inline = false, scrollToTop = true, pageSize, onPageSize,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
  className?: string
  /** Inline pagers sit inside a filter or heading row; the default sits below the results. */
  inline?: boolean
  /** Sidebar pagers stay put; the main list jumps back to the top. */
  scrollToTop?: boolean
  /** Supply both to offer a page-size control alongside the pager. */
  pageSize?: number
  onPageSize?: (size: number) => void
}) {
  const showSize = pageSize !== undefined && onPageSize !== undefined
  if (totalPages <= 1 && !showSize) return null

  // Paging from the bottom pager would otherwise leave you at the foot of a new list.
  const go = (next: number) => {
    onPage(next)
    if (scrollToTop) scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      // On a phone the pager takes its own full-width row rather than being
      // squeezed against the filters and clipped at the screen edge.
      className={cn(
        'flex items-center gap-2 max-sm:w-full max-sm:justify-between',
        inline ? 'sm:justify-end' : 'justify-center pt-2',
        className,
      )}
      aria-label="Pagination"
    >
      {showSize && (
        <FilterSelect
          size="sm"
          value={String(pageSize)}
          options={SIZE_OPTIONS}
          onChange={(size) => {
            onPageSize(Number(size))
            onPage(1)
          }}
        />
      )}

      <Button
        size="icon" variant="outline" className="size-8"
        aria-label="Previous page"
        disabled={page <= 1 || totalPages <= 1}
        onClick={() => go(page - 1)}
      >
        <ChevronLeft />
      </Button>

      <span className="min-w-24 text-center font-mono text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <Button
        size="icon" variant="outline" className="size-8"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  )
}
