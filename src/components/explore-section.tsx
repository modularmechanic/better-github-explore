import type { ReactNode } from 'react'
import { AsyncGrid } from '@/components/async-grid'
import { SectionHeader } from '@/components/section-header'
import { pick } from '@/lib/pick'
import type { AsyncState } from '@/hooks/use-async'
import type { Tab } from '@/hooks/use-hash-route'

interface ExploreSectionProps<T> {
  title: string
  blurb: string
  seeAll: { tab: Tab; label: string }
  state: AsyncState<T[]>
  /** How many to tease. The tab behind `seeAll` has the rest. */
  limit: number
  /** Answers the search box. Omit for a section nothing can filter. */
  keep?: (item: T) => boolean
  children: (items: T[]) => ReactNode
  dense?: boolean
  emptyMessage?: string
}

/**
 * One band of the Explore front page: a heading, a see-all link, and a teaser
 * grid over a list that may still be loading.
 *
 * Seven of these were written out longhand in `ExploreView`, differing only in
 * the five values above. `pick` was a generic defined inside that view where
 * nothing else could reach it; it now lives in `lib/pick` with a test, and its
 * null case — which keeps skeletons on screen instead of flashing "nothing
 * matched" — is the part that was worth testing.
 */
export function ExploreSection<T>({
  title, blurb, seeAll, state, limit, keep, children, dense, emptyMessage,
}: ExploreSectionProps<T>) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} blurb={blurb} seeAll={seeAll} />
      <AsyncGrid
        state={{ data: pick(state.data, limit, keep), loading: state.loading, error: state.error }}
        dense={dense}
        skeletonCount={limit}
        emptyMessage={emptyMessage}
      >
        {children}
      </AsyncGrid>
    </section>
  )
}
