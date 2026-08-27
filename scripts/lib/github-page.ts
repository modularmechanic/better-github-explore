/**
 * Shared helpers for the build-time scrapes of github.com's Explore pages.
 *
 * None of /trending, /topics or /collections has an API, and github.com sends
 * no CORS headers, so the browser cannot read them. They are public pages that
 * robots.txt permits, so the snapshot is taken here at build time instead.
 *
 * Every scrape is fragile by nature: if GitHub reshuffles its markup these
 * helpers return nothing, which is why each caller asserts a plausible row
 * count and fails loudly rather than committing an empty file.
 */

const UA = 'better-github-explore/sync (+https://github.com/modularmechanic/better-github-explore)'

/** Fetches a page as text, failing loudly on any non-200. */
export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} from ${url}`)
  return res.text()
}

/** Strips tags and collapses whitespace: markup fragment in, plain text out. */
export const text = (html: string): string =>
  html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/** "1,002" -> 1002. Returns 0 for anything unparseable. */
export const count = (raw: string | undefined | null): number =>
  raw ? Number(raw.replace(/[^\d]/g, '')) || 0 : 0

/** Splits a page into the repeated row blocks GitHub renders lists with. */
export const rows = (html: string): string[] =>
  html.split(/<article class="Box-row/).slice(1)

/** Fails the sync rather than committing a snapshot that lost most of its data. */
export function assertPlausible(what: string, got: number, atLeast: number): void {
  if (got < atLeast) {
    throw new Error(`${what}: only ${got} rows (expected at least ${atLeast}) — the page markup probably changed`)
  }
}
