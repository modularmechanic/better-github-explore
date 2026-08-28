/** Shapes of the GitHub payloads this app actually reads. */

export interface Owner {
  login: string
  avatar_url: string
  html_url: string
  /** "User" or "Organization" — search results include it, so cards can label it. */
  type?: string
}

export interface Repo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  owner: Owner
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  topics?: string[]
  license: { spdx_id: string } | null
  created_at: string
  pushed_at: string
  /** True for a fork: its contributor list is the upstream project's, not yours. */
  fork?: boolean
  /**
   * Read-only on GitHub. Every lens filters these out except Sleeping Giants,
   * which looks for them on purpose and badges what it finds.
   */
  archived?: boolean
  /**
   * Only the `/user/*` reads can ever see this: a `repo`-scoped token returns
   * private repositories, and `watchedRepos`/`starredRepos` filter on it.
   */
  private?: boolean
}

/** A curated topic from the github/explore feed. */
export interface Topic {
  topic_name: string
  display_name: string | null
  short_description: string | null
  content: string | null
  logo: string | null
  released: string | null
  created_by: string | null
  url: string | null
  related: string[]
  aliases: string[]
}

/** A hand-curated collection of repositories from the github/explore feed. */
export interface Collection {
  name: string
  display_name: string | null
  content: string | null
  image: string | null
  created_by: string | null
  items: string[]
}

export interface ExploreFeed {
  topics: Topic[]
  collections: Collection[]
}

export interface RateLimit {
  remaining: number | null
  limit: number | null
  reset: number | null
}

/** Funding metadata parsed out of a repository's .github/FUNDING.yml. */
export interface Funding {
  repo: Repo
  githubLogins: string[]
  external: { platform: string; url: string }[]
}

/** An entry from github.com/resources/events — conferences, webinars, workshops. */
export interface ResourceEvent {
  title: string
  description: string
  url: string
  cta: string
  /** ISO date, or null for always-available on-demand content. */
  date: string | null
  image: string | null
  type: string | null
  region: string | null
  topic: string | null
  availability: string | null
}

/** The authenticated user behind the stored token (`GET /user`). */
export interface Viewer {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  bio: string | null
  company: string | null
  location: string | null
  public_repos: number
  followers: number
  following: number
}
