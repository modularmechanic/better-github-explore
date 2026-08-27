/**
 * The `/user/*` reads — everything that only exists because a token is stored.
 *
 * Split from `github-api.ts` so that module stays what it is: transport, cache
 * and rate-limit accounting. These five are a different concern, consumed by
 * the You tab and the three personalised sections, and every one of them goes
 * through `api()` so the token, the cache sweep on sign-out and the 401
 * handling are all inherited rather than reimplemented.
 */
import { api } from '@/lib/github-api'
import type { Owner, Repo, Viewer } from '@/types/github'

/** The authenticated user behind the stored token (`GET /user`). */
export const viewer = () => api<Viewer>('/user')

/**
 * Watched repositories, public only (`GET /user/subscriptions`).
 *
 * A `repo`-scoped token also returns the viewer's private repositories. They are
 * dropped HERE rather than at each consumer so the You tab, the Explore
 * watchlist, the derived topic ranking and the collection-overlap match are all
 * public-only by construction — no caller can forget.
 *
 * `per_page=100` is the cap and there is deliberately no `Link`-header paging:
 * 100 repositories are already more than a screen, and paging means a header
 * parser this app has never needed.
 */
export const watchedRepos = () =>
  api<Repo[]>('/user/subscriptions?per_page=100').then((r) => r.filter((x) => !x.private))

/** Starred repositories, public only (`GET /user/starred`) — see `watchedRepos` for why. */
export const starredRepos = () =>
  api<Repo[]>('/user/starred?per_page=100').then((r) => r.filter((x) => !x.private))

/** Accounts the viewer follows (`GET /user/following`) — GitHub's "simple user", i.e. `Owner`. */
export const followingUsers = () => api<Owner[]>('/user/following?per_page=100')

/** Everything the viewer signalled interest in. Both halves are cached by `api`. */
export const viewerRepos = () =>
  Promise.all([starredRepos(), watchedRepos()]).then(([s, w]) => [...s, ...w])
