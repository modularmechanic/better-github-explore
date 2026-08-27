/**
 * Snapshots github.com/resources/events into src/data/github-events.json.
 *
 * That page has no API, and github.com sends no CORS headers, so the browser
 * cannot read it directly. It does embed the Contentful payload it renders
 * from, which carries every field the cards need — so this script pulls the
 * page, lifts that payload out and normalises it. Re-run with:
 *
 *   npm run sync:events
 *
 * The mapping is exported and pure; only the block at the bottom touches the
 * network or the filesystem, so tests can import this file safely.
 */
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { ResourceEvent } from '../src/types/github.ts'

const PAGE = 'https://github.com/resources/events'
const OUT = new URL('../src/data/github-events.json', import.meta.url)

interface ContentfulEntry {
  sys: { id: string; contentType: { sys: { id: string } } }
  fields: Record<string, unknown>
}

interface ContentfulAsset {
  sys: { id: string }
  fields: { file?: { url?: string } }
}

/** The `contentfulRawJsonResponse` object embedded in the page. */
export interface ContentfulPayload {
  includes?: { Entry?: ContentfulEntry[]; Asset?: ContentfulAsset[] }
}

/** Contentful rich text is a node tree; the cards only need its words. */
export function plainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const record = node as { value?: string; content?: unknown[] }
  if (typeof record.value === 'string') return record.value
  return (record.content ?? []).map(plainText).join(' ').replace(/\s+/g, ' ').trim()
}

/** Filter entries name their own group: { groupName: "Topic", filterName: "AI" }. */
export function parseFilter(fields: Record<string, unknown>) {
  const group = String(fields.groupName ?? '').trim()
  const value = String(fields.filterName ?? '').trim()
  return group && value ? { group, value } : null
}

const link = (value: unknown) => (value as { sys?: { id?: string } })?.sys?.id ?? ''

/** Flattens the Contentful entry graph into the cards the app renders. */
export function eventsFromContentful(raw: ContentfulPayload): ResourceEvent[] {
  const entries = raw?.includes?.Entry ?? []
  const assets = raw?.includes?.Asset ?? []

  const byId = new Map(entries.map((e) => [e.sys.id, e]))
  const assetById = new Map(assets.map((a) => [a.sys.id, a]))

  return entries
    .filter((entry) => entry.sys.contentType.sys.id === 'indexCard')
    .map((index) => {
      const card = byId.get(link(index.fields.card))
      const cardFields = card?.fields ?? {}
      const image = assetById.get(link(cardFields.image))?.fields.file?.url ?? null

      const tags = ((index.fields.indexFilters ?? []) as unknown[])
        .map((ref) => byId.get(link(ref)))
        .map((entry) => parseFilter(entry?.fields ?? {}))
        .filter((tag): tag is { group: string; value: string } => tag !== null)

      const pick = (group: string) => tags.find((t) => t.group === group)?.value ?? null

      return {
        // Titles are stored as "Event #124 — Name"; the number is internal.
        title:
          plainText(cardFields.headingRich) ||
          String(index.fields.title ?? '').replace(/^Event #\d+\s*[—-]\s*/, ''),
        description: plainText(cardFields.description),
        url: String(cardFields.href ?? ''),
        cta: String(cardFields.ctaText ?? 'Learn more'),
        date: (index.fields.date as string) ?? null,
        image: image ? `https:${image}` : null,
        type: pick('Type'),
        region: pick('Region'),
        topic: pick('Topic'),
        availability: pick('Availability'),
      }
    })
    .filter((event) => event.title && event.url)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
}

/** Pulls the embedded Contentful payload out of the page's JSON script tags. */
export function payloadFromHtml(html: string): ContentfulPayload {
  const script = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/gs)]
    .map((m) => m[1])
    .find((body) => body.includes('contentfulRawJsonResponse'))
  if (!script) throw new Error('Could not find the Contentful payload — the page markup changed')
  return JSON.parse(script).payload.contentfulRawJsonResponse
}

// Only scrape and write when run as a script (`npm run sync:events`).
// Importing this file — from a test, say — must stay free of side effects.
// `?? ''` because a host that imports us may have no argv[1] (`node -e`).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const page = await fetch(PAGE, { headers: { 'User-Agent': 'better-github-explore/sync' } })
  if (!page.ok) throw new Error(`GitHub returned ${page.status} for ${PAGE}`)

  const events = eventsFromContentful(payloadFromHtml(await page.text()))
  // Refuse to write an empty listing. The parser returning nothing means the
// page shape changed, and committing that would quietly empty the Events tab.
if (!events.length) {
  throw new Error(`parsed 0 events from ${PAGE} — the page markup probably changed`)
}

writeFileSync(OUT, JSON.stringify({ syncedAt: new Date().toISOString(), events }, null, 2) + '\n')
  console.log(`synced ${events.length} events from ${PAGE}`)
}
