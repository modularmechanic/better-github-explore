/**
 * Finding sponsorable projects: search for actively maintained popular
 * repositories, then read each one's FUNDING.yml off the CDN. The funding
 * files cost nothing against the API rate limit, so the scan can be wide —
 * only the repository search is rationed.
 */
import { searchRepos } from '@/lib/github-api'
import { since } from '@/lib/explore-queries'
import { fetchFunding } from '@/lib/funding'
import { starVelocity } from '@/lib/format'
import type { Funding, Repo } from '@/types/github'

const PER_REQUEST = 100

export interface ScanResult {
  funded: Funding[]
  scanned: number
}

export interface ScanOptions {
  language?: string
  minStars?: string
  /** How many repositories to look at; every 100 costs one search request. */
  scan?: number
}

export async function findSponsorable(
  { language = 'any', minStars = '2000', scan = 100 }: ScanOptions = {},
): Promise<ScanResult> {
  const query = [
    `stars:>=${minStars}`,
    `pushed:>${since(60)}`,
    language !== 'any' ? `language:"${language}"` : '',
  ].filter(Boolean).join(' ')

  // Sequential rather than parallel, so a narrow result set stops early. Firing
  // every page at once spent the 10/min search budget on requests that could
  // only return an empty page — the widest scan is 3 requests, and wasting 2 of
  // them is what locks an anonymous visitor out.
  const pages = Math.max(1, Math.ceil(scan / PER_REQUEST))
  const repos: Repo[] = []

  for (let page = 1; page <= pages; page++) {
    // Ask only for what is left of the scan, so a scan of 250 reads 100/100/50
    // rather than 300 repositories.
    const perPage = Math.min(PER_REQUEST, scan - repos.length)
    if (perPage <= 0) break

    const { items, total_count } = await searchRepos(query, { perPage, page })
    repos.push(...items)
    // A short page means the results are exhausted; so does reaching the total.
    if (items.length < perPage || repos.length >= total_count) break
  }

  const funded = (await Promise.all(repos.map(fetchFunding)))
    .filter((f): f is Funding => f !== null)

  return { funded, scanned: repos.length }
}

export type SponsorSort = 'stars' | 'momentum' | 'active'

export const SORTERS: Record<SponsorSort, (a: Funding, b: Funding) => number> = {
  stars: (a, b) => b.repo.stargazers_count - a.repo.stargazers_count,
  momentum: (a, b) => starVelocity(b.repo) - starVelocity(a.repo),
  active: (a, b) => b.repo.pushed_at.localeCompare(a.repo.pushed_at),
}

/** Platforms present in a scan, so the filter only offers what exists. */
export function platformsIn(funded: Funding[]): string[] {
  const platforms = new Set<string>()
  for (const entry of funded) {
    if (entry.githubLogins.length) platforms.add('github')
    entry.external.forEach((link) => platforms.add(link.platform))
  }
  return [...platforms].sort()
}

export const hasPlatform = (entry: Funding, platform: string) =>
  platform === 'any' ||
  (platform === 'github' ? entry.githubLogins.length > 0 : entry.external.some((l) => l.platform === platform))

/** Platform keys whose display name is not just their slug title-cased. */
const PLATFORM_NAMES: Record<string, string> = {
  github: 'GitHub Sponsors',
  open_collective: 'Open Collective',
  ko_fi: 'Ko-fi',
  buy_me_a_coffee: 'Buy Me a Coffee',
  thanks_dev: 'thanks.dev',
  community_bridge: 'CommunityBridge',
  custom: 'Own page',
}

/**
 * Display name for a funding platform. Pass the link's `url` where there is
 * one: a custom link is better named by its host than by "Own page". The
 * platform filter has only a key to go on, so it omits it.
 */
export function platformLabel(platform: string, url?: string): string {
  if (platform === 'custom' && url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return PLATFORM_NAMES.custom
    }
  }
  return PLATFORM_NAMES[platform] ?? platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
