/**
 * "People behind your code" — the contributors to the repositories you own,
 * and which of them accept sponsorship.
 *
 * This is the one feature here that genuinely requires a token, for two
 * reasons. It reads your own repositories, and — more fundamentally — whether
 * a person accepts sponsorship is not in the REST API at all. The user object
 * has no sponsors field; a personal FUNDING.yml is not a convention GitHub
 * follows (checked: sindresorhus, tj and yyx990803 all 404); and
 * github.com/sponsors/<login> answers correctly but sends no CORS headers, so
 * the browser cannot read it. Only GraphQL exposes `hasSponsorsListing`, and
 * GraphQL refuses unauthenticated requests.
 *
 * Cost for a token holder: one request for their repositories, one per
 * repository scanned (up to MAX_REPOS), and one GraphQL call per SPONSOR_BATCH
 * maintainers — usually a single call, more only for a widely-contributed set.
 * Roughly a dozen requests against a token's 5000/hour.
 */
import { api } from '@/lib/github-api'
import { readToken } from '@/lib/token'
import type { Repo } from '@/types/github'

/** A person who has contributed to one of your repositories. */
export interface Maintainer {
  login: string
  avatarUrl: string
  /** Commits across your repositories, summed. */
  contributions: number
  /** Which of your repositories they have contributed to. */
  repos: string[]
  /** Whether GitHub Sponsors is set up for them. Null until GraphQL answers. */
  sponsorable: boolean | null
}

interface ContributorResponse {
  login: string
  avatar_url: string
  contributions: number
  type: string
}

/** Repositories to scan. Beyond this the request count stops being polite. */
const MAX_REPOS = 10
/** GraphQL aliases per document; comfortably under any complexity limit. */
const SPONSOR_BATCH = 80

/**
 * Asks GraphQL which of these logins accept sponsorship, in one request.
 *
 * Logins are interpolated into the document as aliases rather than variables
 * because GraphQL has no way to vary a field's arguments across a list. They
 * are sanitised first: a GitHub login cannot contain anything but
 * alphanumerics and hyphens, so anything else is dropped rather than escaped.
 */
async function fetchSponsorable(logins: string[]): Promise<Map<string, boolean>> {
  const safe = logins.filter((l) => /^[A-Za-z0-9-]+$/.test(l))
  if (!safe.length) return new Map()

  // Batched rather than truncated: a popular repository can have more
  // contributors than one document should carry, and silently dropping the
  // tail would mark real sponsorable maintainers as unknown.
  const batches: string[][] = []
  for (let i = 0; i < safe.length; i += SPONSOR_BATCH) {
    batches.push(safe.slice(i, i + SPONSOR_BATCH))
  }

  const maps = await Promise.all(batches.map(fetchSponsorBatch))
  return new Map(maps.flatMap((m) => [...m]))
}

/** One GraphQL document for up to SPONSOR_BATCH logins. */
async function fetchSponsorBatch(safe: string[]): Promise<Map<string, boolean>> {
  const query = `query {
    ${safe.map((login, i) => `u${i}: user(login: "${login}") { login hasSponsorsListing }`).join('\n')}
  }`

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${readToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`GraphQL responded ${res.status}`)

  const body = (await res.json()) as {
    data?: Record<string, { login: string; hasSponsorsListing: boolean } | null>
  }
  // A login that no longer resolves comes back null beside the others rather
  // than failing the whole document, so skip those instead of throwing.
  return new Map(
    Object.values(body.data ?? {})
      .filter((u): u is { login: string; hasSponsorsListing: boolean } => u !== null)
      .map((u) => [u.login, u.hasSponsorsListing]),
  )
}

/**
 * Contributors across the viewer's own repositories, most involved first.
 * Returns null when no token is set — the caller should hide the section
 * rather than show an empty one.
 */
export async function findMaintainers(): Promise<Maintainer[] | null> {
  if (!readToken()) return null

  const repos = await api<Repo[]>('/user/repos?per_page=30&sort=pushed&type=owner')

  // The viewer owns their forks, so `type=owner` returns them — and a fork's
  // contributor list is the UPSTREAM project's. Someone who forked react would
  // otherwise see React's core team credited with tens of thousands of commits
  // to "your code", pushing their actual collaborators out of the list.
  const scanned = repos
    .filter((r) => !r.fork && !r.full_name.endsWith('/.github'))
    .slice(0, MAX_REPOS)

  // Every repository here is owned by the viewer, so their login is on any of
  // them — no extra request needed to learn who to exclude below.
  const viewer = scanned[0]?.owner.login ?? repos[0]?.owner.login

  const byLogin = new Map<string, Maintainer>()
  for (const repo of scanned) {
    // One repository failing (empty, or contributors disabled) must not lose
    // the rest of the scan.
    const contributors = await api<ContributorResponse[]>(
      `/repos/${repo.full_name}/contributors?per_page=25`,
    ).catch(() => [])

    for (const person of contributors) {
      if (person.type !== 'User') continue // Skip bots such as dependabot[bot].
      // You are not someone to sponsor for your own work, and you would top
      // every list by commit count.
      if (person.login === viewer) continue
      const existing = byLogin.get(person.login)
      if (existing) {
        existing.contributions += person.contributions
        existing.repos.push(repo.name)
      } else {
        byLogin.set(person.login, {
          login: person.login,
          avatarUrl: person.avatar_url,
          contributions: person.contributions,
          repos: [repo.name],
          sponsorable: null,
        })
      }
    }
  }

  const maintainers = [...byLogin.values()].sort((a, b) => b.contributions - a.contributions)

  // Sponsorability is a bonus: if GraphQL is unavailable the list still stands,
  // it just cannot say who accepts funding.
  const sponsorable = await fetchSponsorable(maintainers.map((m) => m.login)).catch(() => new Map())
  for (const maintainer of maintainers) {
    maintainer.sponsorable = sponsorable.get(maintainer.login) ?? null
  }

  return maintainers
}

/**
 * Display order for the strip: whoever accepts sponsorship first, because
 * that is the only actionable row, then everyone else by contribution count.
 *
 * `findMaintainers` already sorts by contributions, and both halves keep that
 * order — this is a stable partition, not a re-sort.
 */
export const sponsorableFirst = (maintainers: Maintainer[]): Maintainer[] => [
  ...maintainers.filter((m) => m.sponsorable),
  ...maintainers.filter((m) => !m.sponsorable),
]
