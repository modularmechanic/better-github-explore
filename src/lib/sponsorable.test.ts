import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchRepos } from '@/lib/github-api'
import { fetchFunding } from '@/lib/funding'
import { SORTERS, findSponsorable, hasPlatform, platformLabel, platformsIn } from '@/lib/sponsorable'
import type { Funding, Repo } from '@/types/github'

vi.mock('@/lib/github-api', () => ({ searchRepos: vi.fn() }))
vi.mock('@/lib/funding', () => ({ fetchFunding: vi.fn() }))

const search = vi.mocked(searchRepos)
const funding = vi.mocked(fetchFunding)

const NOW = new Date('2024-03-10T12:00:00Z')
// 60 days before NOW — the "actively maintained" cutoff the query encodes.
const PUSHED_SINCE = '2024-01-10'

let nextId = 1

function repo(over: Partial<Repo> = {}): Repo {
  const id = nextId++
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`,
    html_url: `https://github.com/owner/repo-${id}`,
    description: null,
    owner: { login: 'owner', avatar_url: '', html_url: '' },
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    language: null,
    license: null,
    created_at: '2024-03-09T12:00:00Z',
    pushed_at: '2024-03-09T12:00:00Z',
    ...over,
  }
}

const fund = (over: Partial<Funding> = {}): Funding => ({
  repo: repo(),
  githubLogins: [],
  external: [],
  ...over,
})

const page = (...items: Repo[]) => ({ items, total_count: items.length })
/** A full page with more behind it — the only case that should page onward. */
/** Honours the requested page size, so a partial last page is not mistaken for exhaustion. */
const sizedPage = (total: number) => (_q: string, o?: { perPage?: number }) =>
  Promise.resolve({ items: Array.from({ length: o?.perPage ?? 100 }, () => repo()), total_count: total })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  search.mockReset()
  funding.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('findSponsorable', () => {
  it('searches popular, recently pushed repositories and keeps only funded ones', async () => {
    const [a, b] = [repo(), repo()]
    search.mockResolvedValue(page(a, b))
    const onlyA = fund({ repo: a, githubLogins: ['octocat'] })
    funding.mockResolvedValueOnce(onlyA).mockResolvedValueOnce(null)

    const result = await findSponsorable()

    expect(result).toEqual({ funded: [onlyA], scanned: 2 })
    expect(search).toHaveBeenCalledExactlyOnceWith(
      `stars:>=2000 pushed:>${PUSHED_SINCE}`,
      { perPage: 100, page: 1 },
    )
  })

  it('adds a language qualifier for anything but "any"', async () => {
    search.mockResolvedValue(page())

    await findSponsorable({ language: 'Rust', minStars: '500' })

    expect(search).toHaveBeenCalledWith(
      `stars:>=500 pushed:>${PUSHED_SINCE} language:"Rust"`,
      { perPage: 100, page: 1 },
    )
  })

  it('splits a scan wider than one request across pages', async () => {
    search.mockImplementation(sizedPage(400) as never)
    funding.mockResolvedValue(null)

    const result = await findSponsorable({ scan: 250 })

    // The last page asks only for the remainder of the scan, not a full page.
    expect(search.mock.calls.map(([, options]) => options)).toEqual([
      { perPage: 100, page: 1 },
      { perPage: 100, page: 2 },
      { perPage: 50, page: 3 },
    ])
    expect(result.scanned).toBe(250)
  })

  it('stops paging as soon as the results run out', async () => {
    // A short page means there is nothing behind it. Asking anyway spends the
    // search budget — which is the scarce resource — on a guaranteed empty page.
    search.mockResolvedValue(page(repo()))
    funding.mockResolvedValue(null)

    const result = await findSponsorable({ scan: 300 })

    expect(search).toHaveBeenCalledTimes(1)
    expect(result.scanned).toBe(1)
  })

  it('stops once the accumulated results reach the reported total', async () => {
    search.mockResolvedValue({ items: Array.from({ length: 100 }, () => repo()), total_count: 100 })
    funding.mockResolvedValue(null)

    await findSponsorable({ scan: 300 })

    expect(search).toHaveBeenCalledTimes(1)
  })

  it('never asks for more per page than the whole scan', async () => {
    search.mockResolvedValue(page())

    await findSponsorable({ scan: 30 })

    expect(search).toHaveBeenCalledWith(expect.any(String), { perPage: 30, page: 1 })
  })
})

describe('SORTERS', () => {
  // 100 stars in 1 day beats 600 stars in 60 days on momentum, and loses on stars.
  const young = fund({ repo: repo({ stargazers_count: 100, pushed_at: '2024-03-01T00:00:00Z' }) })
  const old = fund({
    repo: repo({
      stargazers_count: 600,
      created_at: '2024-01-10T12:00:00Z',
      pushed_at: '2024-03-09T00:00:00Z',
    }),
  })

  it('stars ranks the most-starred first', () => {
    expect([young, old].sort(SORTERS.stars)).toEqual([old, young])
  })

  it('momentum ranks the fastest-growing first', () => {
    expect([old, young].sort(SORTERS.momentum)).toEqual([young, old])
  })

  it('active ranks the most recently pushed first', () => {
    expect([young, old].sort(SORTERS.active)).toEqual([old, young])
  })
})

describe('platformsIn', () => {
  it('lists every platform present in a scan, sorted, without duplicates', () => {
    const funded = [
      fund({ githubLogins: ['octocat'], external: [{ platform: 'patreon', url: 'p' }] }),
      fund({ external: [{ platform: 'patreon', url: 'q' }, { platform: 'ko_fi', url: 'k' }] }),
    ]

    expect(platformsIn(funded)).toEqual(['github', 'ko_fi', 'patreon'])
  })

  it('omits github when no entry has a sponsors login', () => {
    expect(platformsIn([fund({ external: [{ platform: 'polar', url: 'x' }] })])).toEqual(['polar'])
  })

  it('returns nothing for an empty scan', () => {
    expect(platformsIn([])).toEqual([])
  })
})

describe('hasPlatform', () => {
  const entry = fund({ githubLogins: ['octocat'], external: [{ platform: 'ko_fi', url: 'k' }] })
  const external = fund({ external: [{ platform: 'ko_fi', url: 'k' }] })

  it('"any" matches everything', () => {
    expect(hasPlatform(fund(), 'any')).toBe(true)
  })

  it('"github" matches only entries with a sponsors login', () => {
    expect(hasPlatform(entry, 'github')).toBe(true)
    expect(hasPlatform(external, 'github')).toBe(false)
  })

  it('any other platform matches against the external links', () => {
    expect(hasPlatform(external, 'ko_fi')).toBe(true)
    expect(hasPlatform(external, 'patreon')).toBe(false)
  })
})

describe('platformLabel', () => {
  it('names the platforms whose slug does not title-case cleanly', () => {
    expect(platformLabel('github')).toBe('GitHub Sponsors')
    expect(platformLabel('ko_fi')).toBe('Ko-fi')
    expect(platformLabel('thanks_dev')).toBe('thanks.dev')
  })

  it('title-cases an unmapped slug rather than showing it raw', () => {
    expect(platformLabel('open_source_fund')).toBe('Open Source Fund')
  })

  it('names a custom link by its host, dropping the www', () => {
    expect(platformLabel('custom', 'https://www.example.com/donate')).toBe('example.com')
  })

  it('falls back to the generic name for a custom link it cannot parse', () => {
    // The filter dropdown has only the key, and a malformed URL must not throw.
    expect(platformLabel('custom')).toBe('Own page')
    expect(platformLabel('custom', 'not a url')).toBe('Own page')
  })
})
