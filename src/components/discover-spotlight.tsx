import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AsyncGrid } from '@/components/async-grid'
import { CollectionCard } from '@/components/collection-card'
import { Segmented, type Option } from '@/components/filter-controls'
import { useAsync } from '@/hooks/use-async'
import {
  AREAS_SHOWN, periodSeed, spotlightPicks, type SpotlightPeriod,
} from '@/lib/discover-spotlight'
import { exploreFeed } from '@/lib/github-api'

const PERIODS: Option<SpotlightPeriod>[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const STORAGE_KEY = 'bx-spotlight-period'

/** Remembered per browser, like the theme — a reading preference, not state. */
function storedPeriod(): SpotlightPeriod {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'monthly' ? 'monthly' : 'weekly'
  } catch {
    return 'weekly' // private mode, or storage disabled
  }
}

/**
 * Curated collections, one per area of expertise, above the lenses.
 *
 * Costs no API budget at all: the Explore feed is served from a CDN, and a
 * collection card needs nothing the feed does not already carry. The previous
 * version resolved one collection's repositories instead, which cost a search
 * and showed a single subject for the whole period.
 */
export function DiscoverSpotlight() {
  const [period, setPeriod] = useState<SpotlightPeriod>(storedPeriod)
  const feed = useAsync(() => exploreFeed(), [])

  const picks = spotlightPicks(feed.data?.collections, periodSeed(period))

  const choose = (next: SpotlightPeriod) => {
    setPeriod(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Nothing to do — the choice simply will not outlive the session.
    }
  }

  // The lenses are the tab; a feed that will not load is not worth a panel here.
  if (feed.error || (!feed.loading && !picks.length)) return null

  return (
    <section className="space-y-3 rounded-2xl border bg-card/40 p-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 kicker">
            <Sparkles className="size-3.5 text-primary" /> Collections in focus
          </p>
          <p className="max-w-[70ch] text-sm text-on-glow">
            Hand-curated by GitHub, one per field — a different set every{' '}
            {period === 'monthly' ? 'month' : 'week'}.
          </p>
        </div>
        <div className="ml-auto">
          <Segmented value={period} options={PERIODS} onChange={choose} />
        </div>
      </div>

      <AsyncGrid
        state={{ data: picks.length ? picks : null, loading: feed.loading, error: null }}
        skeletonCount={AREAS_SHOWN}
        emptyMessage="No collections in the current feed."
      >
        {(items) => items.map(({ area, collection }) => (
          <div key={area.slug} className="flex flex-col gap-1.5">
            <p className="kicker truncate">{area.label}</p>
            <CollectionCard
              collection={collection}
              largest={Math.max(...items.map((p) => p.collection.items.length))}
            />
          </div>
        ))}
      </AsyncGrid>
    </section>
  )
}
