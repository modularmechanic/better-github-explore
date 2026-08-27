/**
 * Parsers for github.com/topics and github.com/collections.
 *
 * They live here, apart from scripts/sync-explore-pages.ts, so they can be
 * exercised against fixed HTML with no network — the scrape itself is fragile
 * by nature and these are the only part of it worth testing.
 *
 * What they extract is exactly what explore-feed.github.com's JSON does not
 * carry: which topics GitHub *features*, which it calls *popular*, the hero
 * copy, and the order it lists collections in. Everything else about topics
 * and collections still comes from the feed at runtime.
 *
 * Regexes rather than a DOM parser on purpose: adding jsdom to the build for
 * four fields costs more than it saves, and every extraction below takes the
 * FIRST match inside a bounded block, so a markup shuffle yields nothing
 * rather than something wrong — and the caller's assertPlausible() fails.
 */
import type { CollectionsPage, FeaturedTopic, PageHero, TopicsPage } from '../types/explore-pages'
import { text } from '../../scripts/lib/github-page.ts'

/** Heading the featured list sits under; everything above it is the icon grid. */
const FEATURED_HEADING = 'All featured topics'

/** Wrapper GitHub repeats once per featured topic. */
const FEATURED_ROW = '<div class="tmp-py-4 border-bottom d-flex flex-justify-between">'

/**
 * The star button that closes each featured row.
 *
 * Splitting on FEATURED_ROW leaves the LAST row running to the end of the
 * document, so a row missing an image would otherwise borrow one from the
 * footer. Cutting here keeps every row's matches inside that row.
 */
const FEATURED_ROW_END = '<div class="flex-grow-0">'

/** Both pages render the hero as the page <h1> followed by a lead paragraph. */
function parseHero(html: string): PageHero {
  const hero = /<h1[^>]*>([\s\S]*?)<\/h1>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/.exec(html)
  return { title: text(hero?.[1] ?? ''), blurb: text(hero?.[2] ?? '') }
}

/** One featured row: slug, display name, blurb and the topic icon. */
function featuredTopic(block: string): FeaturedTopic | null {
  // split() returns the whole block when the marker is absent, which would let
  // the last row scan the rest of the page and pick up a footer image as its
  // icon. Require the boundary instead of silently over-reading.
  if (!block.includes(FEATURED_ROW_END)) return null
  const row = block.split(FEATURED_ROW_END)[0]
  const slug = /href="\/topics\/([^"]+)"/.exec(row)?.[1]
  if (!slug) return null

  const name = text(/<p class="f3[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(row)?.[1] ?? '')
  const description = text(/<p class="f5 color-fg-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(row)?.[1] ?? '')
  return {
    slug,
    // GitHub occasionally features a topic with no write-up; the slug is the
    // only name we can still show, and null beats an empty string downstream.
    name: name || slug,
    description: description || null,
    // Already an absolute explore-feed.github.com URL in the markup.
    image: /<img[^>]+src="([^"]+)"/.exec(row)?.[1] ?? null,
  }
}

/**
 * Slugs of the "Popular topics" sidebar, in GitHub's order.
 *
 * Matched by walking every anchor rather than by a fixed attribute order,
 * because GitHub emits `data-ga-click` before `href` and `class` after it.
 */
function popularTopics(html: string): string[] {
  const slugs = [...html.matchAll(/<a\s([^>]*)>/g)]
    .map((match) => match[1])
    .filter((attrs) => /class="[^"]*topic-tag/.test(attrs))
    .map((attrs) => /href="\/topics\/([^"]+)"/.exec(attrs)?.[1])
    .filter((slug): slug is string => Boolean(slug))
  return [...new Set(slugs)]
}

/** Snapshot of /topics, minus the timestamp the sync script stamps on. */
export function parseTopicsPage(html: string): Omit<TopicsPage, 'capturedAt'> {
  const section = html.split(FEATURED_HEADING)[1] ?? ''
  const featured = section
    .split(FEATURED_ROW)
    .slice(1)
    .map(featuredTopic)
    .filter((topic): topic is FeaturedTopic => topic !== null)

  return { hero: parseHero(html), featured, popular: popularTopics(html) }
}

/**
 * Snapshot of /collections, minus the timestamp.
 *
 * Every /collections/{slug} link on the page in document order, deduped: the
 * page shows a handful of collections twice — once in the top grid, once in
 * the list below — and it is that combined order, not the set, that is the
 * editorial signal the feed lacks.
 */
export function parseCollectionsPage(html: string): Omit<CollectionsPage, 'capturedAt'> {
  const slugs = [...html.matchAll(/href="\/collections\/([^"#?/]+)"/g)].map((match) => match[1])
  return { hero: parseHero(html), order: [...new Set(slugs)] }
}
