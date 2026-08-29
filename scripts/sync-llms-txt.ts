/**
 * Writes public/llms.txt and public/sitemap.xml from the committed snapshots.
 *
 *   npm run sync:llms
 *
 * Runs last in the cron, after the three scrapes, because it reads what they
 * wrote. It makes no network requests of its own — everything it needs is
 * already on disk — so it cannot fail the run for a reason the scrapes have not
 * already reported.
 *
 * Why the site needs this at all, and what it does not solve, is in
 * src/lib/llms-txt.ts. Formatting lives there too, where it is tested; this
 * file is only the disk half.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { buildLlmsTxt, buildSitemap, type LlmsRepo } from '../src/lib/llms-txt.ts'

/**
 * Pages is served from a repository subpath, so the trailing segment is not
 * optional — a sitemap `loc` of the bare origin would name a site that is not
 * this one. Overridable so a fork does not have to patch the source.
 */
const SITE_URL = process.env.SITE_URL ?? 'https://modularmechanic.github.io/better-github-explore/'

const root = (path: string) => new URL(`../${path}`, import.meta.url)
const readJson = (path: string) => JSON.parse(readFileSync(root(path), 'utf8'))

/**
 * The same repository trends in several periods and languages at once, so the
 * 40 snapshots hold roughly 780 rows for ~550 distinct projects. Keep the first
 * sighting of each and order by stars: this file is a catalogue of what the
 * site lists, not a reproduction of any one tab's ranking.
 */
function uniqueTrendingRepos(): LlmsRepo[] {
  const dir = 'public/data/trending'
  const seen = new Map<string, LlmsRepo>()

  for (const file of readdirSync(root(dir)).filter((name) => name.endsWith('.json'))) {
    // index.json is the manifest of which snapshots exist, not a snapshot.
    if (file === 'index.json') continue
    for (const repo of readJson(`${dir}/${file}`).repos ?? []) {
      if (!repo.fullName || seen.has(repo.fullName)) continue
      seen.set(repo.fullName, {
        fullName: repo.fullName,
        description: repo.description ?? null,
        language: repo.language ?? null,
        stars: repo.stars ?? 0,
      })
    }
  }

  return [...seen.values()].sort((a, b) => b.stars - a.stars)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const topicsPage = readJson('src/data/topics-page.json')
  const collectionsPage = readJson('src/data/collections-page.json')
  const eventsFile = readJson('src/data/github-events.json')

  const repos = uniqueTrendingRepos()

  /*
   * Trending's own timestamp, because trending is what the catalogue mostly is:
   * 552 of its entries come from those snapshots and a few dozen from the other
   * three files. Reading it from anywhere else describes a different scrape —
   * harmless while one cron run writes all four within a couple of minutes, and
   * quietly wrong the first time one of them fails and leaves its file behind at
   * yesterday's date.
   *
   * No `new Date()` at the end of the chain. A missing timestamp means the
   * snapshots are not what this script thinks they are, and stamping the file
   * with the moment it happened to run would publish stale data under a fresh
   * date — the one failure here nobody could see from the output.
   */
  const capturedAt: string | undefined =
    readJson('public/data/trending/index.json').capturedAt
    ?? topicsPage.capturedAt
    ?? eventsFile.syncedAt
  if (!capturedAt) throw new Error('no capturedAt in any snapshot — refusing to date llms.txt by guess')

  const llms = buildLlmsTxt({
    siteUrl: SITE_URL,
    capturedAt,
    repos,
    topics: topicsPage.featured ?? [],
    collections: collectionsPage.order ?? [],
    events: (eventsFile.events ?? []).map((event: { title: string; url: string; date: string | null }) => ({
      title: event.title,
      url: event.url,
      date: event.date ?? null,
    })),
  })

  // The point of the file is the catalogue. Publishing one with the heading and
  // no repositories would look fine and say nothing, so refuse to write it —
  // the previous, still-valid file stays on disk and the run goes red.
  if (repos.length < 100) {
    throw new Error(`only ${repos.length} unique trending repos — refusing to publish a gutted llms.txt`)
  }

  writeFileSync(root('public/llms.txt'), llms)
  writeFileSync(root('public/sitemap.xml'), buildSitemap({ siteUrl: SITE_URL, lastmod: capturedAt }))

  console.log(
    `llms.txt: ${repos.length} repos, ${topicsPage.featured?.length ?? 0} topics, ` +
    `${collectionsPage.order?.length ?? 0} collections, ${eventsFile.events?.length ?? 0} events`,
  )
}
