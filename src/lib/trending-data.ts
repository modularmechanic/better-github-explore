/**
 * Reads the build-time github.com/trending snapshots out of public/data.
 *
 * Why files rather than the API: github.com/trending ranks by stars gained
 * during a period, a number no public endpoint exposes, and github.com sends
 * no CORS headers, so the browser cannot scrape the page itself either.
 * scripts/sync-trending.ts captures it at build time instead.
 *
 * The payoff is that these are same-origin static assets, copied verbatim into
 * dist and served next to the bundle: they cost NOTHING against the GitHub API
 * rate limit, so the Trending tab stays free however hard the filters are
 * toggled. That budget is the entire reason the snapshot exists.
 *
 * Every URL is built from import.meta.env.BASE_URL because vite.config.ts sets
 * base:'./' and Pages serves the app from /<repo>/ — a leading-slash
 * "/data/..." works on localhost and 404s in production.
 */
import type { TrendingIndex, TrendingSince, TrendingSnapshot } from '@/types/trending'

/** One in-flight promise per file, so re-selecting a filter does not refetch. */
const cache = new Map<string, Promise<unknown>>()

function loadJson<T>(file: string): Promise<T> {
  const hit = cache.get(file)
  if (hit) return hit as Promise<T>

  const pending = fetch(`${import.meta.env.BASE_URL}data/trending/${file}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Trending snapshot ${file} is unavailable (HTTP ${res.status}).`)
      return res.json() as Promise<T>
    })
    .catch((error: Error) => {
      // Evict on failure: a cached rejection would keep the tab broken for the
      // rest of the session over one flaky request.
      cache.delete(file)
      throw error
    })

  cache.set(file, pending)
  return pending
}

/** The filter options: which periods and which languages were captured. */
export const loadTrendingIndex = () => loadJson<TrendingIndex>('index.json')

/**
 * One since/language combination. `language` is the slug from the index, not
 * GitHub's URL segment — C++ is `cpp` here because `c%2B%2B` is not a filename.
 */
export const loadTrendingSnapshot = (since: TrendingSince, language: string) =>
  loadJson<TrendingSnapshot>(`${since}-${language}.json`)
