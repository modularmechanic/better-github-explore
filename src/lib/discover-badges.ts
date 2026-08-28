/**
 * The two facts a Discover card cannot already show for itself.
 *
 * Deliberately not a momentum badge: `RepoCard` has rendered stars-per-day in
 * its kicker since long before this tab existed, so a "fast riser" label would
 * be the same number twice. What is left is categorical — state the card has no
 * other way to express.
 *
 * Thresholds are days, not adjectives, so the label can be justified: "New" is
 * a month old at most, and that is what the byline's own timestamp will say.
 */
import type { Repo } from '@/types/github'

const NEW_DAYS = 30

const daysSince = (iso: string) => (Date.now() - Date.parse(iso)) / 86_400_000

export type BadgeTone = 'warn' | 'info'

export interface RepoBadge {
  label: string
  tone: BadgeTone
  /** Why it is here — the card's badges are otherwise unexplained. */
  title: string
}

/**
 * Archived reads as a warning because it changes what the repository *is*: a
 * read-only snapshot rather than something to file an issue against. It is the
 * one badge that matters most on Sleeping Giants, where the whole set may be
 * archived and nothing else on the card would say so.
 */
export function badgesFor(repo: Repo): RepoBadge[] {
  const badges: RepoBadge[] = []
  if (repo.archived) {
    badges.push({ label: 'Archived', tone: 'warn', title: 'Read-only on GitHub — no longer accepting changes' })
  }
  if (daysSince(repo.created_at) <= NEW_DAYS) {
    badges.push({ label: 'New', tone: 'info', title: `Created in the last ${NEW_DAYS} days` })
  }
  return badges
}
