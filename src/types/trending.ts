/**
 * Shapes for the github.com/trending snapshot.
 *
 * These are deliberately NOT the REST `Repo` type. The trending page ranks by
 * stars gained during a period — a number no public API exposes — and it
 * carries a different field set: no license, no timestamps, no topics, but a
 * period delta and the avatars of who built it. Modelling it separately keeps
 * that distinction honest instead of faking a half-populated `Repo`.
 */

/** One row of github.com/trending. */
export interface TrendingRepo {
  /** "owner/name", the identity everything else is derived from. */
  fullName: string
  owner: string
  name: string
  description: string | null
  language: string | null
  /** Language colour as GitHub renders it, e.g. "#3178c6". */
  languageColor: string | null
  stars: number
  forks: number
  /** Stars gained during the window — the number the page actually ranks by. */
  starsInPeriod: number
  /** Contributor avatar URLs GitHub shows under "Built by". */
  builtBy: string[]
}

/** One row of github.com/trending/developers. */
export interface TrendingDeveloper {
  login: string
  /** Display name, when the account sets one. */
  name: string | null
  avatar: string
  /** The repository GitHub highlights for them, if any. */
  popularRepo: { name: string; description: string | null } | null
}

/** How far back the ranking looks. Mirrors GitHub's `since` parameter. */
export type TrendingSince = 'daily' | 'weekly' | 'monthly'

/** One snapshot file: a single since/language combination. */
export interface TrendingSnapshot {
  since: TrendingSince
  /** GitHub's language slug, or "all" for the unfiltered page. */
  language: string
  /** ISO timestamp of the scrape, so the UI can admit how stale it is. */
  capturedAt: string
  repos: TrendingRepo[]
  developers: TrendingDeveloper[]
}

/** Index of every snapshot available, written alongside them. */
export interface TrendingIndex {
  capturedAt: string
  since: TrendingSince[]
  /** Language slugs, "all" first, each with the label to show in the filter. */
  languages: { slug: string; label: string }[]
}
