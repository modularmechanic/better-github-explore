/**
 * Snapshots github.com/topics and github.com/collections into src/data/.
 *
 * Both pages carry an editorial layer that explore-feed.github.com's JSON does
 * not — featured topics, popular topics, hero copy, collection order — and
 * github.com sends no CORS headers, so the browser cannot read them. Neither
 * page is disallowed by robots.txt, so the snapshot is taken here at build
 * time instead. Re-run with:
 *
 *   npm run sync:pages
 *
 * The two files are a few kB each, so they live in src/data and ship inside
 * the bundle rather than being fetched from public/ at runtime.
 *
 * Parsing lives in src/lib/explore-pages-parse.ts, where it is tested; this
 * file is only the network and disk half, and touches neither on import.
 */
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { assertPlausible, fetchPage } from './lib/github-page.ts'
import { parseCollectionsPage, parseTopicsPage } from '../src/lib/explore-pages-parse.ts'

const TOPICS_URL = 'https://github.com/topics'
const COLLECTIONS_URL = 'https://github.com/collections'

const TOPICS_OUT = new URL('../src/data/topics-page.json', import.meta.url)
const COLLECTIONS_OUT = new URL('../src/data/collections-page.json', import.meta.url)

// Only scrape and write when run as a script (`npm run sync:pages`), so that
// importing this file stays free of side effects. `?? ''` because a host that
// imports us may have no argv[1] (`node -e`).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // One timestamp for both files: they are one snapshot of one moment.
  const capturedAt = new Date().toISOString()
  const [topicsHtml, collectionsHtml] = await Promise.all([
    fetchPage(TOPICS_URL),
    fetchPage(COLLECTIONS_URL),
  ])

  const topics = parseTopicsPage(topicsHtml)
  const collections = parseCollectionsPage(collectionsHtml)

  // Floors, not targets: GitHub features ~16 topics, lists 10 popular ones and
  // ~22 collections. Anything below this means the markup moved, and a mostly
  // empty snapshot must fail the sync rather than be committed.
  assertPlausible('featured topics', topics.featured.length, 10)
  assertPlausible('popular topics', topics.popular.length, 10)
  assertPlausible('collections', collections.order.length, 20)

  writeFileSync(TOPICS_OUT, JSON.stringify({ capturedAt, ...topics }, null, 2) + '\n')
  writeFileSync(COLLECTIONS_OUT, JSON.stringify({ capturedAt, ...collections }, null, 2) + '\n')

  console.log(
    `synced ${topics.featured.length} featured and ${topics.popular.length} popular topics from ${TOPICS_URL}`,
  )
  console.log(`synced ${collections.order.length} collections from ${COLLECTIONS_URL}`)
}
