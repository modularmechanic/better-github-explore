# Better GitHub Explore

A replacement UI for [github.com/explore](https://github.com/explore) — the same five sections,
denser cards, real filters, and more information per repository.

Runs entirely in the browser: no backend, and no token needed for the public tabs — a personal
access token unlocks the personalised **You** tab and the **Discover** tab.

```bash
npm install
npm run dev
```

## Sections

| Tab | Source | Notes |
| --- | --- | --- |
| **Explore** | everything below | The front page: a stats dashboard over this week's breakouts, your starred topics and collections, then a slice of every section. |
| **You** | GitHub REST `/user/*` | Your Watched, Starred and Following repos/people, in one tab. Public repos only — private ones are filtered out before they reach the UI. **Hidden entirely until a token is saved.** |
| **Trending** | [github.com/trending](https://github.com/trending) snapshot | The real page, not an approximation of it: ranked by **stars gained during the window**, the number GitHub itself ranks by and no API exposes. Sub-tabs for **Repositories** and **Developers**, both read straight from the page. 3 windows × 13 languages, filtered in memory — **zero API requests**. |
| **Discover** | GitHub REST `/search/repositories` + the Explore feed | Trending of our own making, where Trending above is GitHub's. Eight **lenses**, each a query we chose that asks something the trending page cannot: *Hidden Gems*, *Rising Stars*, *Old But Gold*, *Fresh Finds*, *Rock Solid*, *Sleeping Giants* (thousands of stars, untouched for a year), *Community Hungry*, and *Class of YYYY*. Any lens crosses with 15 purpose **categories** — Design, Science, Writing, Game Dev, Finance, Crypto… — assembled one topic at a time because GitHub's search will not OR qualifiers. **Collections in focus** sits on top: GitHub's own curated collections, one per field, rotating **weekly or monthly** at the reader's choice and seeded by the period so everyone sees the same set. Costs nothing against the API — the feed is a CDN read. **Hidden until a token is saved** (see `docs/adr/0001`). |
| **Topics** | [`explore-feed.github.com/feed.json`](https://explore-feed.github.com/feed.json) + [github.com/topics](https://github.com/topics) snapshot | 1255 curated topics with logos, descriptions and related topics, plus the editorial layer the feed does not carry: which topics GitHub *features*, which it calls *popular*, and the hero copy. Drilling into one runs a `topic:` search. |
| **Collections** | same feed + [github.com/collections](https://github.com/collections) snapshot | 111 hand-curated collections, presented in GitHub's own order rather than by size. Opening one resolves every repository in a **single** search request (`repo:a/b repo:c/d …`). |
| **Events** | [github.com/resources/events](https://github.com/resources/events) | GitHub's conferences, webinars and workshops, with official artwork, dates and registration links. That page has no API and github.com sends no CORS headers, so it is snapshotted at build time — see below. |
| **Sponsors** | `FUNDING.yml` via `raw.githubusercontent.com` | GitHub's Sponsors API is GraphQL-only and requires auth, so this scans the funding file behind each repository's Sponsor button. Funding files cost nothing against the rate limit, so the scan widens to 300 repositories for one extra search request. Filter by funding platform, language and popularity; sort by stars, momentum or recent activity. |

## Cards

Each repository reads as a short article: a kicker (language + momentum), a headline derived from
the repository name, a byline, and the first image or YouTube still found in its README.

- **README media** — the first non-badge image, or a video thumbnail, pulled from the README once
  the card scrolls into view.
- **Expand** — the *README* toggle in the footer opens an excerpt inline.
- **Quick look** — the eye icon opens the full rendered README in a panel over the grid (no iframe,
  no navigation away). Markdown is sanitised with DOMPurify before rendering.
- **Favourites** — star a topic or collection to pin it to the top of its tab; stored per browser.
  With a token saved, Explore, Topics and Collections also grow PAT-derived sections drawn from
  your Watched, Starred and Following data.
- **Written-language filter** — GitHub only exposes *programming* language, so the human language is
  detected from each description with [franc](https://github.com/wooorm/franc). Available on
  Trending and on topic and collection pages.
- **Open in GitHub Desktop** — the `x-github-client://` handler GitHub's own button uses; quietly inert if Desktop is not installed.
- **Pagination** — every list pages. Sponsors pages through the search API (capped at GitHub's
  1000-result limit); the rest, Trending included, page client-side over data already in hand.

## Build-time snapshots

Four sections of github.com have no API behind them, and github.com sends no CORS headers, so the
browser cannot read them either. They are public pages `robots.txt` permits, so they are scraped at
build time and shipped as static JSON:

```bash
npm run sync:trending   # github.com/trending (+ /developers) -> public/data/trending/*.json
npm run sync:pages      # github.com/topics, github.com/collections -> src/data/*-page.json
npm run sync:events     # github.com/resources/events -> src/data/github-events.json
```

Why scrape rather than call an API:

- **Trending** ranks by *stars gained during a period*. Nothing in the REST or GraphQL API exposes
  that number, which is why every search-based "trending" — this app's own previous one included —
  lists different repositories than the page it claims to mirror.
- **Topics** and **Collections** take their bulk from `explore-feed.github.com` at runtime, but the
  feed carries no editorial layer: featured topics, popular topics, hero copy, and the order GitHub
  presents collections in exist only in the pages' HTML.
- **Events** embeds the Contentful payload it renders from, and nothing else publishes it.

**Trending now costs zero GitHub API requests.** It used to spend a search request per page of
results and re-spend it on every filter change; it spends none. Topics and Collections gained their
editorial layer for free as well — both listings come from the feed and the snapshot, and only
drilling into a single topic or collection still spends a search request. Events was already free.

Every parser is unit-tested, and every script asserts a plausible row count before writing — a
markup change fails the sync loudly instead of committing an empty file. Each snapshot carries a
`capturedAt`; Trending and Events display theirs, so the freshness of the data those tabs are
*built from* is always visible. Topics and Collections do not display one, because their snapshot
only supplies GitHub's editorial layer — the hero copy, which topics are featured, the ordering —
while the topics and collections themselves come live from the Explore feed on every load.

`.github/workflows/sync-data.yml` re-runs all three every three hours, commits only when something
actually changed, and then dispatches the deploy explicitly — a push made with `GITHUB_TOKEN` starts
no workflow, so the site would otherwise never pick the new data up.

## Deploying

Landing on `main` does not publish. `.github/workflows/deploy.yml` runs on a **published release**,
so shipping is a decision rather than a side effect of merging:

```bash
gh release create v1.0.0 --generate-notes
```

Every deploy runs the full CI workflow first, then publishes `dist/` to Pages and fetches the live
URL back to assert the app root is really there — a green deploy serving a blank page is worse than
a red one, because nobody looks.

Two things still publish without a release, both deliberate. The three-hourly data sync dispatches
the deploy itself, or a refreshed snapshot would sit on `main` until someone cut a release; and
`workflow_dispatch` remains the manual escape hatch for republishing.

### Why these are snapshots and not live

Because a browser cannot read those pages. `github.com` sends no CORS headers, so `fetch` is
blocked; there is no API for trending rankings, since stars-gained-per-period is not exposed
anywhere; and Pages serves static files, so there is no server to proxy through. Every tab that
shows snapshot data says how old it is rather than implying it is live.

Three hours is the practical floor: the scrape is 78 requests, and each refresh that finds a change
commits and redeploys. Trending moves slowly enough that this is not a real limitation — the top
row held for two and a half hours when measured.

## Charts

The Explore dashboard is plain SVG and CSS with no charting dependency. On its default Week window
it reuses the request the section above it already makes, so it adds nothing; switching to Day or
Month fetches that window once and caches it for 30 minutes. Language segments reuse GitHub's own language colours so
they match the dots on every card; since those brand hues are not a tuned categorical palette,
identity is carried by direct labels and a legend that doubles as the data table, never by colour
alone. Every mark has a hover tooltip.

## Rate limits

Unauthenticated GitHub allows 60 core requests/hour, and search has a separate per-*minute*
budget: 10/min unauthenticated, 30/min with a token. Every response is cached in
`localStorage` for 30 minutes; the Explore feed, language colours and `FUNDING.yml` reads are served
from CDNs that do not count against the limit; and Trending reads the build-time snapshots above, so
it costs nothing at all. The remaining budget shows in the header.

For heavier browsing, add a personal access token with **no scopes** (🔑 in the header) to get
5000 requests/hour and unlock the **You** and **Discover** tabs. It is stored in this browser only
and sent only to `api.github.com`.

## Layout

```
src/
  lib/          github-api.ts (fetch + cache + rate limit), funding-yml.ts (parser), format.ts,
                trending-parse.ts + explore-pages-parse.ts (the scrapers' HTML parsing, unit-tested
                away from the network), trending-data.ts (snapshot loading),
                discover-*.ts (the lenses, the category bundles, the union search, the spotlight)
  hooks/        use-async.ts (async state), use-hash-route.ts (routing)
  components/   cards, header, shared async grid, shadcn/ui primitives
  views/        one file per tab, plus the two detail pages
  data/         topics-page.json, collections-page.json, github-events.json — small, so bundled
public/data/    trending snapshots — 39 files, 720 kB; fetched one at a time so only the window
                being viewed is downloaded, rather than bundling all of them
scripts/        sync-trending.ts, sync-explore-pages.ts, sync-github-events.ts — network and disk
  lib/          github-page.ts — fetch and tag-stripping helpers shared by all three
```

Built with Vite, React, TypeScript, Tailwind CSS v4 and shadcn/ui.
READMEs and funding files are read from raw.githubusercontent.com, outside the API budget.
Unofficial and unaffiliated with GitHub.
