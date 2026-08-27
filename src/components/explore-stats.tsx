import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3 } from 'lucide-react'
import { Notice } from '@/components/async-grid'
import { BarChart } from '@/components/charts/bar-chart'
import { ColumnChart } from '@/components/charts/column-chart'
import { DonutChart } from '@/components/charts/donut-chart'
import { useAsync } from '@/hooks/use-async'
import { loadLanguageColors } from '@/lib/language-colors'
import { Segmented, type Option } from '@/components/filter-controls'
import { breakoutBuckets, languageMix, topMovers, type ChartWindow } from '@/lib/explore-stats'
import { compactNumber, starVelocity } from '@/lib/format'
import type { Repo } from '@/types/github'

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="gap-1 p-3 sm:p-4">
      <p className="kicker">{label}</p>
      <p className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</p>
      {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
    </Card>
  )
}

function Panel({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 p-5">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{blurb}</p>
      </div>
      {children}
    </Card>
  )
}

const WINDOWS: Option<ChartWindow>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

/** The window in words, which is the only thing most of the copy varies by. */
const WORD: Record<ChartWindow, string> = { day: 'today', week: 'this week', month: 'this month' }

const copyFor = (window: ChartWindow) => ({
  tiles: `repositories ${WORD[window]}`,
  mix: `Share of ${WORD[window]}'s breakouts by language.`,
  movers: 'Stars gained per day since creation.',
  // A day is bucketed into three-hour blocks, so it names them; the longer
  // windows have nothing to name and just say when.
  timeline: window === 'day'
    ? 'Which three-hour block they appeared in.'
    : `When ${WORD[window]}'s repositories first appeared.`,
})

/** The dashboard strip: what the trending set in view actually looks like. */
export function ExploreStats({
  repos, window, onWindow, loading = false, error = null,
}: {
  repos: Repo[] | null
  window: ChartWindow
  onWindow: (window: ChartWindow) => void
  /** Passed through so an error or an empty window is not shown as loading. */
  loading?: boolean
  error?: string | null
}) {
  // Language colours arrive asynchronously; recompute once they land so the
  // charts are not left holding the grey fallback.
  const colors = useAsync(loadLanguageColors, [])

  const stats = useMemo(() => {
    if (!repos?.length) return null
    const fastest = [...repos].sort((a, b) => starVelocity(b) - starVelocity(a))[0]
    return {
      languages: languageMix(repos),
      movers: topMovers(repos),
      timeline: breakoutBuckets(repos, window),
      stars: repos.reduce((total, r) => total + r.stargazers_count, 0),
      developers: new Set(repos.map((r) => r.owner.login)).size,
      fastest,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, window, colors.data])

  const windowPicker = <Segmented value={window} options={WINDOWS} onChange={onWindow} />
  const copy = copyFor(window)

  // A window can be legitimately empty — early in a UTC day nothing has yet
  // been created that meets the Day floor — and the request can fail. Neither
  // is "loading", and showing skeletons for them leaves the picker looking dead.
  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">{windowPicker}</div>
        {loading ? (
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))]">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : error ? (
          <Notice icon={AlertCircle} title="Could not load the charts" detail={error} />
        ) : (
          <Notice
            icon={BarChart3}
            title="Nothing broke out in this window yet"
            detail="Try a wider window — early in the day the last 24 hours can be genuinely empty."
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {windowPicker}
        <span className="text-xs text-on-glow">
          Every chart below describes this window.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] sm:gap-4">
        <Tile label="Breaking out" value={String(repos!.length)} detail={copy.tiles} />
        <Tile label="Stars gained" value={compactNumber(stats.stars)} detail="across those repositories" />
        <Tile label="Developers" value={String(stats.developers)} detail="behind them" />
        <Tile
          label="Fastest riser"
          value={`${compactNumber(Math.round(starVelocity(stats.fastest)))}/d`}
          detail={stats.fastest.full_name}
        />
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
        <Panel title="What they're written in" blurb={copy.mix}>
          <DonutChart slices={stats.languages} total={repos!.length} unit="repos" />
        </Panel>

        <Panel title="Fastest movers" blurb={copy.movers}>
          <BarChart slices={stats.movers} unit="stars/day" />
        </Panel>

        <Panel title="When they appeared" blurb={copy.timeline}>
          <ColumnChart slices={stats.timeline} unit="repositories" />
        </Panel>
      </div>
    </div>
  )
}
