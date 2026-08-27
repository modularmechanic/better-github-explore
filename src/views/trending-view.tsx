import { useMemo, useState } from 'react'
import { TrendingDeveloperCard } from '@/components/trending-developer-card'
import { TrendingRepoCard } from '@/components/trending-repo-card'
import { AsyncGrid } from '@/components/async-grid'
import { Pagination } from '@/components/pagination'
import { FilterSelect, FilterSummary, Segmented, type Option } from '@/components/filter-controls'
import { useAsync } from '@/hooks/use-async'
import { useResultList } from '@/hooks/use-result-list'
import { loadTrendingIndex, loadTrendingSnapshot } from '@/lib/trending-data'
import { matches } from '@/lib/format'
import { SPOKEN_LANGUAGES, matchesLanguage } from '@/lib/spoken-language'
import type { TrendingSince } from '@/types/trending'

/**
 * github.com/trending, as GitHub actually ranks it.
 *
 * This used to approximate the page from the search API — `created:>` sorted by
 * stars — which is why it listed different repositories than github.com/trending
 * does. The real ranking is stars gained inside the window, which no public API
 * exposes and which CORS forbids the browser from scraping, so the page is
 * captured at build time and read from public/data instead. The filters here are
 * GitHub's own: period and language, nothing invented.
 *
 * The consequence: this data is as old as the last build. capturedAt is no
 * longer surfaced here, so nothing on the page distinguishes it from live data.
 *
 * The one list view that does NOT use `<ResultList>`: two independent lists in
 * a split layout, each with its pager in its own column heading. It calls
 * `useResultList` twice and lays the rest out itself — which is the reason that
 * hook is separate from the component in the first place.
 */
const SINCE: Option<TrendingSince>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

/** Shown until index.json lands; every capture includes the unfiltered page. */
const FALLBACK_LANGUAGES: Option<string>[] = [{ value: 'all', label: 'All languages' }]

const DEVELOPERS_PER_PAGE = 5

/** Heading for a column of the split layout, with its pager on the right. */
function ColumnHeading({
  title, count, children,
}: { title: string; count?: number | string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-2">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {count}
        </span>
      )}
      {children && <div className="ml-auto">{children}</div>}
    </div>
  )
}

export function TrendingView({ search }: { search: string }) {
  const [since, setSince] = useState<TrendingSince>('daily')
  const [language, setLanguage] = useState('all')
  const [spoken, setSpoken] = useState('any')

  // Two static files, both same-origin: neither spends GitHub API rate limit.
  const index = useAsync(loadTrendingIndex, [])
  const state = useAsync(() => loadTrendingSnapshot(since, language), [since, language])
  const snapshot = state.data

  const languages = useMemo<Option<string>[]>(
    () => index.data?.languages.map(({ slug, label }) => ({ value: slug, label })) ?? FALLBACK_LANGUAGES,
    [index.data],
  )

  // Both columns filter the snapshot in memory — there is nothing to re-fetch.
  const repos = useResultList(
    { data: snapshot?.repos ?? null, loading: state.loading, error: state.error },
    {
      select: (items) => items.filter((r) =>
        matches(search, r.fullName, r.description) && matchesLanguage(r.description, spoken)),
      deps: [search, spoken],
    },
  )
  const developers = useResultList(
    { data: snapshot?.developers ?? null, loading: state.loading, error: state.error },
    {
      select: (items) => items.filter((d) =>
        matches(search, d.login, d.name, d.popularRepo?.name, d.popularRepo?.description)),
      deps: [search],
      pageSize: DEVELOPERS_PER_PAGE,
    },
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={since} options={SINCE} onChange={setSince} />
        <FilterSelect value={language} options={languages} onChange={setLanguage} />
        <FilterSelect value={spoken} options={SPOKEN_LANGUAGES} onChange={setSpoken} />
      </div>

      {/* Repositories lead; the developers behind them run alongside. */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem] 2xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-4">
          <ColumnHeading title="Repositories" count={repos.items?.length}>
            <Pagination
              page={repos.page}
              totalPages={repos.totalPages}
              onPage={repos.setPage}
              pageSize={repos.pageSize}
              onPageSize={repos.setPageSize}
              inline
            />
          </ColumnHeading>
          <AsyncGrid
            state={repos.state}
            emptyMessage="No repositories match these filters."
            skeletonCount={12}
          >
            {(items) => items.map((repo) => (
              <TrendingRepoCard key={repo.fullName} repo={repo} since={since} />
            ))}
          </AsyncGrid>
          <Pagination page={repos.page} totalPages={repos.totalPages} onPage={repos.setPage} />
        </div>

        <aside className="space-y-4">
          <ColumnHeading title="Developers" count={developers.items?.length}>
            <Pagination
              page={developers.page}
              totalPages={developers.totalPages}
              onPage={developers.setPage}
              scrollToTop={false}
              inline
            />
          </ColumnHeading>
          <AsyncGrid
            state={developers.state}
            emptyMessage="No developers match these filters."
            skeletonCount={4}
            className="grid-cols-1"
          >
            {(people) => people.map((d) => <TrendingDeveloperCard key={d.login} developer={d} />)}
          </AsyncGrid>
        </aside>
      </div>

      <FilterSummary>
        {`${repos.total} repositories · ${developers.total} developers`}
        {' · '}{`trending/${language === 'all' ? '' : language}?since=${since}`}
      </FilterSummary>
    </div>
  )
}
