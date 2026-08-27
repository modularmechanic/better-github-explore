import { useState } from 'react'
import { FilterSelect } from '@/components/filter-controls'
import { DetailHeader } from '@/components/detail-header'
import { RepoCard } from '@/components/repo-card'
import { ResultList } from '@/components/result-list'
import { useAsync } from '@/hooks/use-async'
import { useResultList } from '@/hooks/use-result-list'
import { exploreFeed, reposByName } from '@/lib/github-api'
import { matches, stripHtml } from '@/lib/format'
import { SPOKEN_LANGUAGES, matchesLanguage } from '@/lib/spoken-language'
import type { Collection, Repo } from '@/types/github'

interface Resolved {
  collection: Collection | null
  repos: Repo[]
  /** Entries search could not resolve — renamed, deleted or now-private repos. */
  missing: string[]
}

async function resolve(name: string): Promise<Resolved> {
  const { collections } = await exploreFeed()
  const collection = collections.find((c) => c.name === name) ?? null
  if (!collection) return { collection: null, repos: [], missing: [] }

  const repos = (await reposByName(collection.items.slice(0, 100)))
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
  const found = new Set(repos.map((r) => r.full_name.toLowerCase()))
  return { collection, repos, missing: collection.items.filter((i) => !found.has(i.toLowerCase())) }
}

export function CollectionDetailView({ name, search }: { name: string; search: string }) {
  const state = useAsync(() => resolve(name), [name])
  const { collection, repos = [], missing = [] } = state.data ?? {}

  const [spoken, setSpoken] = useState('any')
  const list = useResultList(
    { data: state.data ? repos : null, loading: state.loading, error: state.error },
    {
      select: (items) => items.filter((r) =>
        matches(search, r.full_name, r.description) && matchesLanguage(r.description, spoken)),
      deps: [search, spoken],
    },
  )

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="collections"
        backLabel="All collections"
        title={collection?.display_name || name}
        meta={collection ? `${repos.length} of ${collection.items.length} repositories${collection.created_by ? ` · curated by ${collection.created_by}` : ''}` : undefined}
        description={stripHtml(collection?.content) || undefined}
      />

      <ResultList
        list={list}
        emptyMessage="No repositories in this collection."
        controls={<FilterSelect value={spoken} options={SPOKEN_LANGUAGES} onChange={setSpoken} />}
      >
        {(items) => items.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
      </ResultList>

      {missing.length > 0 && (
        <p className="text-xs text-on-glow">
          Unresolved entries (renamed, deleted or private): {missing.join(', ')}
        </p>
      )}
    </div>
  )
}
