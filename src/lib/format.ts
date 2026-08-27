/** Display formatting shared by every card. */
import type { Repo } from '@/types/github'

/**
 * Compact notation handles the unit ladder, the trailing ".0" and the
 * promotion a rounded value needs (999_950 is "1M", never "1000k").
 */
const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

/** GitHub lower-cases thousands and leaves the larger units shouty. */
export const compactNumber = (n: number | undefined | null): string =>
  COMPACT.format(n ?? 0).replace('K', 'k')

export function timeAgo(iso: string): string {
  const minutes = (Date.now() - new Date(iso).getTime()) / 60_000
  // Garbage timestamps do appear in the Explore feed; "NaNy ago" must not ship.
  if (Number.isNaN(minutes)) return 'some time ago'
  if (minutes < 1) return 'just now' // Clock skew can put a timestamp in the future.
  // Round before comparing against each ceiling, so 59m42s reads "1h ago"
  // rather than "60m ago" and 23h59m reads "1d ago" rather than "24h ago".
  const units = (size: number) => Math.round(minutes / size)
  if (units(1) < 60) return `${units(1)}m ago`
  if (units(60) < 24) return `${units(60)}h ago`
  if (units(1_440) < 31) return `${units(1_440)}d ago`
  // Compare the elapsed time to a year, not the rounded month count: rounding
  // 11.6 months to 12 would otherwise report 353 days as "1y ago".
  if (minutes < 525_600) return `${units(43_200)}mo ago`
  // Number() drops the trailing ".0" so a year reads "1y ago", not "1.0y ago".
  return `${Number((minutes / 525_600).toFixed(1))}y ago`
}

/**
 * Stars per day since creation. GitHub publishes no star history, so this is
 * the closest honest momentum signal the public API supports.
 */
export function starVelocity(repo: Repo): number {
  const days = Math.max(1, (Date.now() - new Date(repo.created_at).getTime()) / 86_400_000)
  return repo.stargazers_count / days
}

/** The Explore feed ships descriptions as HTML; cards want plain text. */
export const stripHtml = (html: string | null | undefined) =>
  String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/** Case-insensitive "does any of this text contain the term" match. */
export const matches = (term: string, ...fields: (string | null | undefined)[]) =>
  !term || fields.filter(Boolean).join(' ').toLowerCase().includes(term.toLowerCase())

/**
 * The Explore feed already ships absolute asset URLs; older entries carry a
 * bare filename, which resolves against the github/explore repository.
 */
export const exploreAsset = (kind: 'topics' | 'collections', dir: string, file: string) =>
  // Only a real scheme passes through: "httpclient.png" is a filename, not a URL.
  /^https?:\/\//i.test(file)
    ? file
    : `https://raw.githubusercontent.com/github/explore/main/${kind}/${dir}/${file}`

/** Acronyms that should stay shouty when a repository name is humanised. */
const ACRONYMS = new Set(['ai', 'ml', 'llm', 'api', 'cli', 'ui', 'ux', 'sdk', 'os', 'ide', 'db',
  'sql', 'css', 'js', 'ts', 'html', 'http', 'json', 'yaml', 'csv', 'pdf', 'gpu', 'cpu', 'rag',
  'mcp', 'vr', 'ar', 'xr', '2d', '3d', 'io', 'ci', 'cd', 'orm', 'jwt', 'ssh', 'dns', 'aws', 'gpt'])

/**
 * Turns a repository name into a headline: `deepseek-harness` -> "Deepseek
 * Harness", `awesome_go` -> "Awesome Go", `reactRouter` -> "React Router".
 * Names that are already display-cased (`TypeScript`) are left alone. A very
 * short name borrows its owner for context, so `shadcn-ui/ui` reads "Shadcn UI".
 */
export function headline(name: string, owner?: string): string {
  const title = titleCase(name)
  if (owner && title.length <= 4) {
    const prefix = titleCase(owner.replace(/[-_](ui|io|dev|labs?|org|team|js)$/i, ''))
    if (prefix.toLowerCase() !== title.toLowerCase()) return `${prefix} ${title}`
  }
  return title
}

function titleCase(name: string): string {
  return name
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    // Split camelCase only when the word is not already display-cased.
    .flatMap((word) =>
      /^[A-Z]/.test(word) ? [word] : word.replace(/([a-z\d])([A-Z])/g, '$1 $2').split(' '))
    .map((word) => {
      if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase()
      if (/[A-Z]/.test(word.slice(1))) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
