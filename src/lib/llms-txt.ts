/**
 * Builds /llms.txt and /sitemap.xml from the committed snapshots.
 *
 * Why this file exists: the app is a hash-routed single page. `#/trending` is a
 * URL *fragment*, so it never reaches a server and no crawler treats it as a
 * separate page — what a fetcher gets from this site is one empty `<div id=
 * "root">`. Every repository, topic and collection the site lists is therefore
 * invisible to anything that does not run JavaScript.
 *
 * llms.txt (llmstxt.org) is the cheap half of the fix: one markdown document,
 * at a stable path, saying plainly what this site lists. It is a *proposed*
 * convention — some LLM tooling fetches it, and it is not a search ranking
 * signal, so it does not on its own make the site findable through Google.
 * Making the individual pages indexable needs pre-rendered HTML at real paths,
 * which is a separate piece of work.
 *
 * Pure on purpose: the script half (scripts/sync-llms-txt.ts) does the reading
 * and writing, so the formatting is testable without touching disk.
 */

export interface LlmsRepo {
  fullName: string
  description: string | null
  language: string | null
  stars: number
}

export interface LlmsTopic {
  slug: string
  name: string
  description?: string | null
}

export interface LlmsEvent {
  title: string
  url: string
  date: string | null
}

export interface LlmsTxtInput {
  /** Site root, with a trailing slash. */
  siteUrl: string
  /** When the underlying snapshots were taken. */
  capturedAt: string
  repos: LlmsRepo[]
  topics: LlmsTopic[]
  /** Collection slugs, in GitHub's own editorial order. */
  collections: string[]
  events: LlmsEvent[]
}

/**
 * Markdown is newline-delimited, so a description carrying one would split a
 * list item in two and leave the tail parsed as prose. Collapse to single
 * spaces and trim; nothing else about the text is ours to change.
 */
const oneLine = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim()

/** 27_820 → "27.8k". Kept local: src/lib/format is browser-facing and pulls in Intl. */
const stars = (count: number): string =>
  count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(count)

const repoLine = (repo: LlmsRepo): string => {
  const description = oneLine(repo.description)
  const facts = [`${stars(repo.stars)} stars`, repo.language].filter(Boolean).join(', ')
  return `- [${repo.fullName}](https://github.com/${repo.fullName})` +
    `: ${description || 'No description.'} (${facts})`
}

/**
 * The llmstxt.org shape: an H1, a blockquote summary, free prose, then H2
 * sections of link lists. Sections with nothing in them are dropped rather than
 * left as empty headings, so a scraper that breaks upstream shows up as a
 * missing section instead of a heading promising rows that are not there.
 */
export function buildLlmsTxt({
  siteUrl, capturedAt, repos, topics, collections, events,
}: LlmsTxtInput): string {
  const site = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`
  const sections: string[] = []

  if (repos.length) {
    sections.push(
      `## Trending repositories\n\n` +
      `${repos.length} repositories, deduplicated across every period and language ` +
      `snapshot behind ${site}#/trending, ordered by stars.\n\n` +
      repos.map(repoLine).join('\n'),
    )
  }

  if (topics.length) {
    sections.push(
      `## Topics\n\n` +
      topics
        .map((topic) => {
          const description = oneLine(topic.description)
          return `- [${topic.name}](https://github.com/topics/${topic.slug})` +
            (description ? `: ${description}` : '')
        })
        .join('\n'),
    )
  }

  if (collections.length) {
    sections.push(
      `## Collections\n\n` +
      collections
        .map((slug) => `- [${slug}](https://github.com/collections/${slug})`)
        .join('\n'),
    )
  }

  if (events.length) {
    sections.push(
      `## Events\n\n` +
      events
        .map((event) => {
          const when = event.date ? ` (${event.date.slice(0, 10)})` : ''
          return `- [${oneLine(event.title)}](${event.url})${when}`
        })
        .join('\n'),
    )
  }

  return [
    `# Better GitHub Explore`,
    ``,
    `> A replacement UI for github.com/explore: GitHub's trending repositories, ` +
    `topics, collections, events and sponsorable projects, in one place.`,
    ``,
    `Everything below is a snapshot taken from github.com at ${capturedAt} and ` +
    `served statically from ${site}. Star counts and rankings are accurate as of ` +
    `that moment, not as of when you are reading this.`,
    ``,
    `The site itself renders client-side, so fetching ${site} returns an empty ` +
    `page shell. This file is the machine-readable version of what it lists.`,
    ``,
    ...sections.flatMap((section) => [section, '']),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

/** `&` in a URL is the one character that would otherwise break the document. */
const xmlEscape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * One entry, because there is honestly only one URL. Hash routes are fragments
 * and every tab shares `/`; listing `#/topics` and friends here would claim
 * pages that no crawler can fetch separately. This grows a real entry per page
 * the day those pages are pre-rendered, and not before.
 */
export function buildSitemap({ siteUrl, lastmod }: { siteUrl: string; lastmod: string }): string {
  const site = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `  <url>`,
    `    <loc>${xmlEscape(site)}</loc>`,
    `    <lastmod>${lastmod.slice(0, 10)}</lastmod>`,
    `    <changefreq>hourly</changefreq>`,
    `  </url>`,
    `</urlset>`,
    ``,
  ].join('\n')
}
