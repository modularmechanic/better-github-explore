import type { ReactNode } from 'react'
import { AlertCircle, SearchX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AsyncState } from '@/hooks/use-async'

interface AsyncGridProps<T> {
  state: AsyncState<T[]>
  children: (items: T[]) => ReactNode
  /** Narrower cards for dense lists such as topics. */
  dense?: boolean
  /** Overrides the track sizing — the Trending sidebar stacks in one column. */
  className?: string
  emptyMessage?: string
  skeletonCount?: number
}

/**
 * Fluid columns with a ceiling: `auto-fill` packs in as many tracks as fit at
 * the minimum card width, while the `max(…)` floor of one-Nth of the row caps
 * the count — four for cards, six for the dense lists. Past that the cards
 * stretch rather than multiplying, and below it they wrap instead of squashing.
 * The subtracted rem values are the gaps between N tracks.
 */
const gridClass = (dense?: boolean, className?: string) =>
  cn('grid gap-4', dense
    ? 'grid-cols-[repeat(auto-fill,minmax(max(13rem,(100%_-_5rem)/6),1fr))]'
    : 'grid-cols-[repeat(auto-fill,minmax(max(19rem,(100%_-_3rem)/4),1fr))]', className)

/**
 * Cards arrive together rather than blinking into place. Applied to the grid's
 * children instead of to each card component so one rule covers every view, and
 * so it stays out of components/ui, which shadcn regenerates.
 *
 * Mount-triggered, so it plays once when a result set lands and not on the
 * re-renders that follow. Kept short: this is meant to take the edge off the
 * swap from skeletons, not to be noticed as an animation.
 */
const CARD_ENTRANCE = '[&>*]:animate-in [&>*]:fade-in-0 [&>*]:duration-200'

/** One place to render loading, error, empty and success for every view. */
export function AsyncGrid<T>({
  state, children, dense, className, emptyMessage = 'Nothing matched.', skeletonCount = 9,
}: AsyncGridProps<T>) {
  if (state.loading) {
    return (
      <div className={gridClass(dense, className)}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <Skeleton key={i} className={dense ? 'h-36 rounded-xl' : 'h-48 rounded-xl'} />
        ))}
      </div>
    )
  }

  if (state.error) return <Notice icon={AlertCircle} title="Something went wrong" detail={state.error} />
  if (!state.data?.length) return <Notice icon={SearchX} title={emptyMessage} />

  return <div className={cn(gridClass(dense, className), CARD_ENTRANCE)}>{children(state.data)}</div>
}

/**
 * `children` is the way out. An empty result that only says "nothing matched"
 * leaves the reader to guess which of five controls caused it; a caller that
 * knows the answer can put the fix here as a button.
 */
export function Notice({
  icon: Icon, title, detail, children,
}: { icon: typeof AlertCircle; title: string; detail?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-center">
      <Icon className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {detail && <p className="max-w-md text-sm text-muted-foreground">{detail}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
