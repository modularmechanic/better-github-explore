import type { ReactNode } from 'react'
import { AsyncGrid } from '@/components/async-grid'
import { SectionHeader } from '@/components/section-header'
import { useAsync } from '@/hooks/use-async'
import { useToken } from '@/hooks/use-token'
import type { Tab } from '@/hooks/use-hash-route'

interface ViewerSectionProps<T> {
  title: string
  /**
   * Receives what will actually be rendered, so a count in the blurb is honest.
   * Text only — `SectionHeader` renders it inside a `<p>`.
   */
  blurb?: string | ((items: T[]) => string)
  seeAll?: { tab: Tab; label: string }
  /**
   * Runs only when a token is stored, and re-runs when the token changes.
   * Fetching belongs here; filtering belongs in `select`, which re-runs on
   * every render without spending a request.
   */
  load: () => Promise<T[]>
  /** Extra values `load` closes over. The token is already covered. */
  deps?: unknown[]
  /** Narrowing that must not trigger a refetch — the search box, a cap. */
  select?: (items: T[]) => T[]
  children: (items: T[]) => ReactNode
  /** Skeletons while the load is in flight, or nothing at all until it settles. */
  whileLoading?: 'skeleton' | 'hide'
  /**
   * How a failed load reads. `notice` is the standard error panel; `inline` is
   * one muted line under the heading; `hide` drops the section silently, for
   * sections whose failure is already reported by a louder one on the same page.
   */
  onError?: 'notice' | 'inline' | 'hide'
  skeletonCount?: number
  dense?: boolean
  /** Overrides the grid's track sizing. */
  className?: string
}

/**
 * A section of the page that exists only for a signed-in viewer.
 *
 * Four of these were written separately — the Explore watchlist, "Topics
 * you're into", the maintainer strip, and the collection overlap on the
 * Collections tab. Each re-derived the same five steps: gate on the token,
 * load only when there is one, narrow by the search box, hide when empty, and
 * decide what a failure looks like. Three of the five had already drifted in
 * the maintainer strip, and the differences that were deliberate survived only
 * as prose in the comments. The one that mattered is now an argument:
 * `onError`, with three values.
 *
 * The section never renders as an empty shell. No token, nothing loaded, or
 * nothing left after `select` — it renders nothing at all.
 */
export function ViewerSection<T>({
  title, blurb, seeAll, load, deps = [], select, children,
  whileLoading = 'skeleton', onError = 'notice', skeletonCount = 6, dense, className,
}: ViewerSectionProps<T>) {
  const { has, version } = useToken()
  // `version` as well as `has`: swapping one token for another leaves `has`
  // true, and the previous account's data must not survive it.
  const state = useAsync(() => (has ? load() : Promise.resolve<T[]>([])), [has, version, ...deps])

  const items = select ? select(state.data ?? []) : (state.data ?? [])
  const settled = !state.loading && !state.error

  if (!has) return null
  if (state.error && onError === 'hide') return null
  if (state.loading && whileLoading === 'hide') return null
  if (settled && items.length === 0) return null

  return (
    <section className="space-y-3">
      <SectionHeader
        title={title}
        blurb={typeof blurb === 'function' ? blurb(items) : blurb}
        seeAll={seeAll}
      />
      {state.error && onError === 'inline' ? (
        <p className="text-sm text-muted-foreground">{state.error}</p>
      ) : (
        <AsyncGrid
          state={{ data: items, loading: state.loading, error: state.error }}
          dense={dense}
          skeletonCount={skeletonCount}
          className={className}
        >
          {children}
        </AsyncGrid>
      )}
    </section>
  )
}
