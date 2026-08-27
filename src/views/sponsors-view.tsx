import { useMemo, useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { Notice } from '@/components/async-grid'
import { MaintainerStrip } from '@/components/maintainer-strip'
import { PageHero } from '@/components/page-hero'
import { ResultList } from '@/components/result-list'
import { SponsorCard } from '@/components/sponsor-card'
import { FilterSelect, Segmented, type Option } from '@/components/filter-controls'
import { useAsync } from '@/hooks/use-async'
import { useResultList } from '@/hooks/use-result-list'
import {
  findSponsorable, hasPlatform, platformLabel, platformsIn, SORTERS, type SponsorSort,
} from '@/lib/sponsorable'
import { matches } from '@/lib/format'

/**
 * GitHub's Sponsors API is GraphQL-only and needs authentication, so this
 * scans the FUNDING.yml of actively maintained popular repositories — the same
 * file GitHub reads to render a repository's Sponsor button. Funding files come
 * from the CDN, so a wider scan costs no extra API requests.
 */
const LANGUAGES: Option<string>[] = [
  { value: 'any', label: 'All languages' },
  ...['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Ruby', 'PHP', 'C++', 'C', 'Java', 'Elixir', 'Swift']
    .map((l) => ({ value: l, label: l })),
]
const POPULARITY: Option<string>[] = [
  { value: '200', label: '200+ stars' },
  { value: '1000', label: '1k+ stars' },
  { value: '5000', label: '5k+ stars' },
  { value: '20000', label: '20k+ stars' },
]
const DEPTHS: Option<string>[] = [
  { value: '100', label: 'Scan 100' },
  { value: '200', label: 'Scan 200' },
  { value: '300', label: 'Scan 300' },
]
const SORTS: Option<SponsorSort>[] = [
  { value: 'stars', label: 'Most starred' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'active', label: 'Recently active' },
]

/**
 * GitHub Sponsors is worth separating from funding in general: it is the only
 * platform where sponsoring happens without leaving GitHub, and the only one
 * whose button the repository itself renders.
 */
type Funded = 'all' | 'sponsors'
const FUNDED: Option<Funded>[] = [
  { value: 'all', label: 'Any funding' },
  { value: 'sponsors', label: '♥ GitHub Sponsors' },
]

export function SponsorsView({ search }: { search: string }) {
  const [language, setLanguage] = useState('any')
  const [minStars, setMinStars] = useState('1000')
  const [depth, setDepth] = useState('100')
  const [platform, setPlatform] = useState('any')
  const [sort, setSort] = useState<SponsorSort>('stars')
  const [funded, setFunded] = useState<Funded>('all')

  const scan = useAsync(
    () => findSponsorable({ language, minStars, scan: Number(depth) }),
    [language, minStars, depth],
  )

  // The scan carries its own count alongside the results, so unwrap it into
  // the plain list shape `useResultList` works over.
  const source = useMemo(
    () => ({ data: scan.data?.funded ?? null, loading: scan.loading, error: scan.error }),
    [scan.data, scan.loading, scan.error],
  )

  const list = useResultList(source, {
    select: (entries) =>
      entries
        .filter((f) =>
          (funded === 'all' || f.githubLogins.length > 0) &&
          hasPlatform(f, platform) &&
          matches(search, f.repo.full_name, f.repo.description, f.githubLogins.join(' '), f.repo.topics?.join(' ')))
        .sort(SORTERS[sort]),
    deps: [platform, sort, funded, search],
  })

  // Only offer platforms that actually turned up in this scan.
  const platformOptions: Option<string>[] = useMemo(() => [
    { value: 'any', label: 'Any platform' },
    ...platformsIn(scan.data?.funded ?? []).map((p) => ({ value: p, label: platformLabel(p) })),
  ], [scan.data])

  const all = scan.data?.funded ?? []
  const onSponsors = all.filter((f) => f.githubLogins.length > 0).length

  return (
    <div className="space-y-8">
      <PageHero
        title="Sponsors"
        blurb="The projects you depend on, and the people who keep them alive. Every funding link here comes from the repository's own FUNDING.yml — the same file GitHub reads to render its Sponsor button."
      />

      <MaintainerStrip />

      <ResultList
        list={list}
        skeletonCount={9}
        empty={
          <Notice
            icon={HeartHandshake}
            title="No sponsorable projects in this slice"
            detail="Try a lower star threshold, another platform, or a wider scan."
          />
        }
        controls={
          <>
            <Segmented value={funded} options={FUNDED} onChange={setFunded} />
            <Segmented value={sort} options={SORTS} onChange={setSort} />
            <FilterSelect value={language} options={LANGUAGES} onChange={setLanguage} />
            <FilterSelect value={minStars} options={POPULARITY} onChange={setMinStars} />
            <FilterSelect value={platform} options={platformOptions} onChange={setPlatform} />
            <FilterSelect value={depth} options={DEPTHS} onChange={setDepth} />
          </>
        }
        summary={
          <>
            {list.total} shown · {onSponsors} of {all.length} funded projects use GitHub Sponsors ·{' '}
            {scan.data?.scanned ?? 0} repositories scanned · funding files read from
            raw.githubusercontent.com
          </>
        }
      >
        {(entries) => entries.map((f) => <SponsorCard key={f.repo.id} funding={f} />)}
      </ResultList>
    </div>
  )
}
