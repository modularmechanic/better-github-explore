/**
 * NOTE ON "WRONG" LANGUAGES: github.com/trending/{language} is not a filter on
 * a repository's primary language, and its pages genuinely list repositories
 * whose language field says something else — microsoft/TypeScript appears on
 * the live weekly Go page, verified against github.com. Filtering those out
 * here would make the snapshot disagree with the page it exists to mirror.
 */

/**
 * Pure parsers for the github.com/trending HTML.
 *
 * They live in src/lib rather than beside the sync script so they can be tested
 * without a network round-trip and without committing a 600 kB fixture: every
 * function here takes a markup string and returns data. The scraping itself is
 * in scripts/sync-trending.ts.
 *
 * Regex, not a DOM parser, on purpose. The snapshot runs in plain node with no
 * jsdom dependency, and the page is a flat list of self-similar rows — the one
 * shape regex handles honestly. Every field is optional-by-construction: GitHub
 * reshuffles this markup without notice, and a missing field must degrade to
 * null rather than throw. The caller (`assertPlausible`) is what turns a
 * wholesale markup change into a failed sync.
 */
import type { TrendingRepo, TrendingDeveloper } from '@/types/trending'
import { text, count, rows } from '../../scripts/lib/github-page.ts'

/** First capture group of `re` in `html`, or undefined when it does not match. */
const grab = (html: string, re: RegExp): string | undefined => html.match(re)?.[1]

/**
 * One `<article class="Box-row">` from /trending.
 *
 * Returns null for a row with no repository link: the page occasionally carries
 * a promo row in the same list, and dropping it beats emitting a blank entry.
 */
function toRepo(row: string): TrendingRepo | null {
  // The heading anchor is the only reliable identity — the visible text is
  // split across an <svg> and two spans as "owner /\n name".
  const href = grab(row, /<h2 class="h3 lh-condensed">[\s\S]*?href="\/([^"]+)"/)
  const [owner, name] = href?.split('/') ?? []
  if (!owner || !name) return null

  // Description is the only <p> in the row carrying the col-9 width class.
  const description = text(grab(row, /<p class="[^"]*\bcol-9\b[^"]*"[^>]*>([\s\S]*?)<\/p>/) ?? '')
  // Repos with no detected language render neither the swatch nor the itemprop.
  const language = grab(row, /itemprop="programmingLanguage"[^>]*>([^<]*)</)?.trim()
  const languageColor = grab(row, /repo-language-color"[^>]*background-color:\s*([^";]+)/)?.trim()

  // count() alone would swallow the digits in the octicon's path data, so the
  // anchor body goes through text() — which drops whole tags — first.
  const total = (kind: 'stargazers' | 'forks') =>
    count(text(grab(row, new RegExp(`href="[^"]*/${kind}"[^>]*>([\\s\\S]*?)</a>`)) ?? ''))

  // "1,002 stars today" / "18 stars this week". Singular when exactly one.
  const period = grab(row, /([\d,]+)\s+stars?\s+(?:today|this week|this month)/)

  // Avatars live between the "Built by" label and the end of its own <span>;
  // no nested <span> sits in between, so the first closer is the right one.
  const builtByBlock = grab(row, /Built by([\s\S]*?)<\/span>/) ?? ''

  return {
    fullName: `${owner}/${name}`,
    owner,
    name,
    description: description || null,
    language: language || null,
    languageColor: languageColor || null,
    stars: total('stargazers'),
    forks: total('forks'),
    starsInPeriod: count(period),
    // text() also decodes the &amp; that separates the avatar's query params.
    // Deduplicated: GitHub sometimes repeats a contributor in this block, and
    // the same face twice says nothing about who built the thing.
    builtBy: [...new Set([...builtByBlock.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => text(m[1])))],
  }
}

/**
 * One `<article class="Box-row d-lg-flex">` from /trending/developers.
 *
 * Note the extra class: matching `class="Box-row"` exactly finds zero rows on
 * that page. The shared `rows()` helper splits on the prefix for that reason.
 */
function toDeveloper(row: string): TrendingDeveloper | null {
  const heading = row.match(/<h1 class="h3 lh-condensed"[^>]*>([\s\S]*?)<\/h1>/)?.[1]
  if (!heading) return null

  const login = grab(heading, /href="\/([^"/]+)"/)
  if (!login) return null

  // GitHub falls back to the login in this heading when the account sets no
  // display name, so an identical string means "no name", not a name.
  const name = text(heading)

  // The profile avatar is the row's first image; "Popular repo" carries none.
  const avatar = grab(row, /<img[^>]+src="([^"]+)"/)

  // The highlighted repo is a nested <article>: its <h1 class="h4"> anchor,
  // then the blurb that follows up to the nested closing tag.
  const popular = row.match(/<h1 class="h4[^"]*"[^>]*>([\s\S]*?)<\/h1>([\s\S]*?)<\/article>/)
  const popularName = text(popular?.[1] ?? '')
  const popularDescription = text(popular?.[2] ?? '')

  return {
    login,
    name: name && name !== login ? name : null,
    avatar: avatar ? text(avatar) : '',
    popularRepo: popularName
      ? { name: popularName, description: popularDescription || null }
      : null,
  }
}

/** Every repository row on a /trending page, in the order GitHub ranked them. */
export function parseTrendingRepos(html: string): TrendingRepo[] {
  return rows(html)
    .map(toRepo)
    .filter((repo): repo is TrendingRepo => repo !== null)
}

/** Every developer row on a /trending/developers page, in ranked order. */
export function parseTrendingDevelopers(html: string): TrendingDeveloper[] {
  return rows(html)
    .map(toDeveloper)
    .filter((dev): dev is TrendingDeveloper => dev !== null)
}
