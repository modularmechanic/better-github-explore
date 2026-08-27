import { useState } from 'react'
import { FilterSelect } from '@/components/filter-controls'
import { DetailHeader } from '@/components/detail-header'
import { RepoCard } from '@/components/repo-card'
import { ResultList } from '@/components/result-list'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/use-async'
import { useResultList } from '@/hooks/use-result-list'
import { exploreFeed, searchRepos } from '@/lib/github-api'
import { matches, stripHtml } from '@/lib/format'
import { SPOKEN_LANGUAGES, matchesLanguage } from '@/lib/spoken-language'
import { navigate } from '@/hooks/use-hash-route'

/** A single topic: its curated write-up plus its most-starred repositories. */
export function TopicDetailView({ topic, search }: { topic: string; search: string }) {
  const meta = useAsync(
    () => exploreFeed().then((f) => f.topics.find((t) => t.topic_name === topic) ?? null),
    [topic],
  )
  const repos = useAsync(() => searchRepos(`topic:${topic}`, { perPage: 36 }).then((r) => r.items), [topic])

  const [spoken, setSpoken] = useState('any')
  const list = useResultList(repos, {
    select: (items) => items.filter((r) =>
      matches(search, r.full_name, r.description) && matchesLanguage(r.description, spoken)),
    deps: [search, spoken],
  })

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="topics"
        backLabel="All topics"
        title={meta.data?.display_name || topic}
        meta={`${list.total} top repositories`}
        description={stripHtml(meta.data?.content) || meta.data?.short_description || undefined}
      >
        {meta.data?.related?.slice(0, 6).map((r) => (
          <Badge key={r} variant="outline" className="cursor-pointer" onClick={() => navigate('topics', r)}>
            {r}
          </Badge>
        ))}
      </DetailHeader>

      <ResultList
        list={list}
        emptyMessage="No repositories for this topic."
        controls={<FilterSelect value={spoken} options={SPOKEN_LANGUAGES} onChange={setSpoken} />}
      >
        {(items) => items.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
      </ResultList>
    </div>
  )
}
