/**
 * Snapshots github.com/trending into public/data/trending/*.json at build time.
 *
 * The page ranks by stars gained during a window — a number no public API
 * exposes, which is why the search-API "trending" everyone builds shows
 * different repositories than the real page. github.com sends no CORS headers,
 * so the browser cannot read it; robots.txt allows it, so we read it here and
 * ship the result as static JSON alongside the Pages build. Re-run with:
 *
 *   npm run sync:trending
 *
 * All parsing lives in src/lib/trending-parse.ts and is unit-tested; this file
 * is only network and filesystem, and only when run as a script.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { fetchPage, assertPlausible } from './lib/github-page.ts'
import { parseTrendingRepos, parseTrendingDevelopers } from '../src/lib/trending-parse.ts'
import type { TrendingSince, TrendingSnapshot, TrendingIndex } from '../src/types/trending.ts'

const OUT_DIR = new URL('../public/data/trending/', import.meta.url)
const SINCE: TrendingSince[] = ['daily', 'weekly', 'monthly']

/**
 * [file slug, filter label]. The slug is ours — it names the JSON file and the
 * index entry, so it has to survive a URL path unescaped, which "c++" and "c#"
 * do not. GitHub's own path segment is derived from the label instead.
 */
const LANGUAGES: [slug: string, label: string][] = [
  ['all', 'All languages'],
  ['typescript', 'TypeScript'],
  ['javascript', 'JavaScript'],
  ['python', 'Python'],
  ['rust', 'Rust'],
  ['go', 'Go'],
  ['java', 'Java'],
  ['cpp', 'C++'],
  ['csharp', 'C#'],
  ['ruby', 'Ruby'],
  ['php', 'PHP'],
  ['swift', 'Swift'],
  ['kotlin', 'Kotlin'],
]

/** GitHub's path segment: lower-cased label, percent-encoded ("c++" -> "c%2B%2B"). */
const pathFor = (label: string) => encodeURIComponent(label.toLowerCase())

/** 78 page loads in a row is rude; one at a time with a pause is not. */
const DELAY_MS = 400
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Fetches and parses one since/language pair. */
async function snapshot(since: TrendingSince, slug: string, label: string): Promise<TrendingSnapshot> {
  const segment = slug === 'all' ? '' : `/${pathFor(label)}`
  const repos = parseTrendingRepos(await fetchPage(`https://github.com/trending${segment}?since=${since}`))
  await pause(DELAY_MS)
  const developers = parseTrendingDevelopers(
    await fetchPage(`https://github.com/trending/developers${segment}?since=${since}`),
  )

  if (since === 'daily' && slug === 'all') {
    // The unfiltered daily page always has rows. A narrow language over a
    // one-day window legitimately may not, so this is the only combination
    // where an empty result proves the markup changed rather than the world.
    assertPlausible('trending repos', repos.length, 10)
    assertPlausible('trending developers', developers.length, 10)
  } else if (!repos.length && !developers.length) {
    console.warn(`  warning: ${since}/${slug} came back empty`)
  }

  return { since, language: slug, capturedAt: new Date().toISOString(), repos, developers }
}

// Only scrape and write when run as a script (`npm run sync:trending`).
// Importing this file must stay free of side effects; `?? ''` because a host
// that imports us may have no argv[1] (`node -e`).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  mkdirSync(OUT_DIR, { recursive: true })

  for (const since of SINCE) {
    for (const [slug, label] of LANGUAGES) {
      const data = await snapshot(since, slug, label)
      writeFileSync(new URL(`${since}-${slug}.json`, OUT_DIR), JSON.stringify(data) + '\n')
      console.log(`${since}-${slug}.json — ${data.repos.length} repos, ${data.developers.length} developers`)
      await pause(DELAY_MS)
    }
  }

  const index: TrendingIndex = {
    capturedAt: new Date().toISOString(),
    since: SINCE,
    languages: LANGUAGES.map(([slug, label]) => ({ slug, label })),
  }
  writeFileSync(new URL('index.json', OUT_DIR), JSON.stringify(index, null, 2) + '\n')
  console.log(`wrote index.json — ${SINCE.length} windows x ${LANGUAGES.length} languages`)
}
