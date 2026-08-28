import { useEffect, useState } from 'react'
import { SearchX, Shuffle } from 'lucide-react'
import { Notice } from '@/components/async-grid'
import { Button } from '@/components/ui/button'
import { DiscoverSpotlight } from '@/components/discover-spotlight'
import { FilterSelect, Segmented } from '@/components/filter-controls'
import { PageHero } from '@/components/page-hero'
import { RepoCard } from '@/components/repo-card'
import { RepoQuickview } from '@/components/repo-quickview'
import { ResultList } from '@/components/result-list'
import { useAsync } from '@/hooks/use-async'
import { navigate } from '@/hooks/use-hash-route'
import { useResultList } from '@/hooks/use-result-list'
import { badgesFor } from '@/lib/discover-badges'
import { CATEGORY_OPTIONS, findCategory, topicOptions } from '@/lib/discover-categories'
import { DEFAULT_LENS, LENS_OPTIONS, LENSES, type LensSlug } from '@/lib/discover-lenses'
import {
  packSelection, unpackSelection, YEARS, type Selection,
} from '@/lib/discover-selection'
import { fetchSelectionResult, queryFor, requestCost } from '@/lib/discover-search'
import { matches } from '@/lib/format'
import { SPOKEN_LANGUAGES, matchesLanguage } from '@/lib/spoken-language'
import type { Repo } from '@/types/github'

const YEAR_OPTIONS = YEARS.map((year) => ({ value: String(year), label: `Class of ${year}` }))
const MAINTENANCE_OPTIONS = [
  { value: 'all', label: 'Any maintenance state' },
  { value: 'maintained', label: 'Still maintained' },
] as const

/**
 * Our own trending, one lens at a time.
 *
 * The Trending tab is GitHub's ranking, mirrored exactly. This one is ours:
 * every lens is a search we chose, named on the rail rather than spelled out
 * underneath the results.
 *
 * Three of the controls cost requests and live in the URL — lens, category and
 * topic — so a result set can be linked to. The search box, the written
 * language and the pager run over what is already in memory and cost nothing,
 * which is why they are not encoded: the link would imply a precision it does
 * not carry.
 */
export function DiscoverView({ lens, search }: { lens: string | null; search: string }) {
  const selection = unpackSelection(lens)
  const { lens: active, year, maintained, category, topic } = selection
  const [spoken, setSpoken] = useState('any')
  const [surprise, setSurprise] = useState<Repo | null>(null)

  const go = (next: Partial<Selection>) =>
    navigate('discover', packSelection({ ...selection, ...next }))

  // The query, not just the slug, is a dependency: it carries today's date, so
  // a tab left open across UTC midnight refetches instead of printing a query
  // underneath results that a different query produced.
  const query = queryFor(selection)
  const result = useAsync(() => fetchSelectionResult(selection), [query, category?.slug, topic])
  const repos = {
    data: result.data?.items ?? null,
    error: result.error,
    loading: result.loading,
  }

  const list = useResultList(repos, {
    // The selection has already curated and ordered; this is only what the
    // user asked for on top.
    select: (items) => items.filter((repo) =>
      matches(search, repo.full_name, repo.description) &&
      matchesLanguage(repo.description, spoken)),
    deps: [search, spoken],
  })

  // A repository picked out of the old results has no business floating over
  // the new ones. Cleared on the selection, not in the change handler, so the
  // browser's back button clears it too. Same shape as App's search reset.
  useEffect(() => setSurprise(null), [query, category?.slug, topic])

  /** Costs nothing: the whole filtered set is already in memory. */
  const pickOne = () => {
    const pool = list.items ?? []
    if (pool.length) setSurprise(pool[Math.floor(Math.random() * pool.length)])
  }

  return (
    <div className="space-y-5">
      <PageHero
        title="Discover"
        blurb="Trending of our own making: lenses over the GitHub API that ask what the trending page cannot — what is quietly good, what has aged well, what appeared this week."
      />

      <DiscoverSpotlight />

      {/* Only ever on screen when something actually failed. A part-fetched
          category looks exactly like a whole one, so the gap has to be said
          out loud even though the rest of the results are worth showing. */}
      {!!result.data?.missing && (
        <p className="text-sm text-muted-foreground">
          {result.data.missing} of {requestCost(selection)} topic searches failed — showing the rest.
        </p>
      )}

      <ResultList
        list={list}
        skeletonCount={12}
        // A narrow lens over a narrow topic is often genuinely empty — "born
        // this week" and `topic:flashcards` do not overlap most weeks. Saying
        // "nothing matched" blames the reader for arithmetic, so the notice
        // names the narrowest thing in play and offers to drop it.
        empty={
          <Notice
            icon={SearchX}
            title={`No ${active.label.toLowerCase()} to show${category ? ` in ${category.label}` : ''}`}
            detail={
              topic || category
                ? `${active.label} is a narrow slice to begin with, and ${topic ? `the ${topic} topic` : category!.label} narrows it further. Widening usually finds plenty.`
                : `${active.label} found nothing this time. Another lens will have more.`
            }
          >
            {topic && (
              <Button size="sm" variant="secondary" onClick={() => go({ topic: null })}>
                Search all of {category!.label}
              </Button>
            )}
            {category && (
              <Button size="sm" variant="secondary" onClick={() => go({ category: null, topic: null })}>
                Drop the category
              </Button>
            )}
            {active.slug !== DEFAULT_LENS && (
              <Button size="sm" variant="secondary" onClick={() => go({ lens: LENSES[DEFAULT_LENS] })}>
                Try {LENSES[DEFAULT_LENS].label}
              </Button>
            )}
          </Notice>
        }
        controls={
          <>
            <Segmented
              value={active.slug}
              options={LENS_OPTIONS}
              onChange={(slug: LensSlug) => go({ lens: LENSES[slug] })}
            />
            {active.slug === 'class' && (
              <>
                <FilterSelect
                  value={String(year)}
                  options={YEAR_OPTIONS}
                  onChange={(next) => go({ year: Number(next) })}
                />
                <FilterSelect
                  value={maintained ? 'maintained' : 'all'}
                  options={MAINTENANCE_OPTIONS}
                  onChange={(next) => go({ maintained: next === 'maintained' })}
                />
              </>
            )}
            <FilterSelect
              value={category?.slug ?? 'all'}
              options={CATEGORY_OPTIONS}
              // Changing subject drops the topic with it: a topic belongs to
              // the bundle it came from.
              onChange={(slug) => go({ category: findCategory(slug), topic: null })}
            />
            {category && (
              <FilterSelect
                value={topic ?? 'all'}
                options={topicOptions(category)}
                onChange={(next) => go({ topic: next === 'all' ? null : next })}
              />
            )}
            <FilterSelect value={spoken} options={SPOKEN_LANGUAGES} onChange={setSpoken} />
            <Button
              size="sm"
              variant="ghost"
              className="h-10 gap-1.5 rounded-xl px-3 text-sm text-muted-foreground"
              disabled={!list.total}
              onClick={pickOne}
              title="Open one of these at random"
            >
              <Shuffle /> Surprise me
            </Button>
          </>
        }
      >
        {(items) => items.map((repo) => (
          <RepoCard key={repo.id} repo={repo} badges={badgesFor(repo)} />
        ))}
      </ResultList>

      {surprise && (
        <RepoQuickview
          repo={surprise}
          open
          onOpenChange={(open) => !open && setSurprise(null)}
        />
      )}
    </div>
  )
}
