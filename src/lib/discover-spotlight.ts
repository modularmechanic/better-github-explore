/**
 * The curated collections on show above the lenses.
 *
 * Everything else on the Discover tab is a query — good at reach, incapable of
 * taste. This is the counterweight: GitHub's own hand-assembled collections.
 *
 * It shows one collection per *area of expertise* rather than a single global
 * pick. A single pick spent a whole period on one subject — a week of Minecraft
 * for someone who came for cybersecurity — because the ~104 collections are
 * heavily weighted toward a few domains and a flat draw has no idea what it is
 * choosing between. Grouping first means every period offers several unrelated
 * doors, and rotating the group means the doors change.
 *
 * Both the area shown and the collection within it are seeded by the period, so
 * every visitor sees the same set and a link still shows what the sender saw.
 * `Math.random()` would give each reader a private, unshareable one.
 */
import type { Collection } from '@/types/github'

/** How often the set turns over. The reader picks; the default is weekly. */
export type SpotlightPeriod = 'weekly' | 'monthly'

export interface SpotlightArea {
  slug: string
  label: string
  /** Collection slugs as the Explore feed names them. */
  collections: string[]
}

/**
 * Areas, and the collections that belong to them.
 *
 * Assembled by hand against the live feed rather than inferred: collection
 * slugs carry no topics, and guessing a domain from the title puts
 * `hacking-minecraft` in security. No collection appears in two areas, so a
 * period cannot show the same one twice.
 *
 * GitHub publishes no finance or crypto collection, so those Discover
 * categories have no area here — the strip offers what exists rather than
 * inventing a thin one to fill the grid.
 */
export const AREAS: SpotlightArea[] = [
  {
    slug: 'gamedev',
    label: 'Game Dev',
    collections: ['game-engines', 'javascript-game-engines', 'hacking-minecraft', 'fantasy-consoles',
      'pixel-art-tools', 'voxel-editors', 'web-games', 'playdate-rust'],
  },
  {
    slug: 'security',
    label: 'Security & Privacy',
    collections: ['ctf-cybersec-resources', 'devsecops', 'vulnerability-databases',
      'internet-censorship-circumventions', 'net-neutrality'],
  },
  {
    slug: 'ai',
    label: 'AI & ML',
    collections: ['ai-agents', 'ai-model-zoos', 'machine-learning', 'open-source-mlops'],
  },
  {
    slug: 'design',
    label: 'Design & Front-end',
    collections: ['design-essentials', 'material-ui-atomic-design', 'react-ui', 'css-frameworks',
      'front-end-javascript-frameworks', 'javascript-state-management', 'web-accessibility'],
  },
  {
    slug: 'science',
    label: 'Science & Hardware',
    collections: ['software-in-science', 'teaching-computational-social-science', 'riscv-cores',
      'riscv-brazil', 'software-defined-radio', 'green-software'],
  },
  {
    slug: 'data',
    label: 'Data & Open Knowledge',
    collections: ['open-data', 'web-scraping', 'open-journalism', 'digital-preservation',
      'algorithms-and-data-structures'],
  },
  {
    slug: 'writing',
    label: 'Writing & Publishing',
    collections: ['static-site-generators', 'nextjs-blog-templates', 'github-pages-examples',
      'text-editors'],
  },
  {
    slug: 'devtools',
    label: 'Dev Tools',
    collections: ['software-development-tools', 'productivity-tools', 'clean-code-linters',
      'clipboard-managers', 'github-browser-extensions', 'bookmarklets-and-userscripts',
      'internal-tools'],
  },
  {
    slug: 'ops',
    label: 'Ops & Platform',
    collections: ['devops-tools', 'platform-engineering', 'load-testing', 'opensource-testing',
      'probot-apps', 'tools-for-open-source'],
  },
  {
    slug: 'learning',
    label: 'Learning',
    collections: ['learn-to-code', 'cheatsheets', 'choosing-projects', 'programming-languages'],
  },
  {
    slug: 'society',
    label: 'Society & Impact',
    collections: ['government', 'social-impact', 'policies', 'open-source-organizations'],
  },
  {
    slug: 'media',
    label: 'Media & Audio',
    collections: ['music', 'vlc-media-player'],
  },
]

/** One row of cards. Enough for variety without burying the lenses below. */
export const AREAS_SHOWN = 4

/** Below this a collection is too thin to be worth a card. */
const MIN_ITEMS = 4

/**
 * FNV-1a with murmur3's final mix.
 *
 * The finalizer is not decoration. Plain FNV-1a over "2026-W35", "2026-W36",
 * "2026-W37" — inputs differing in one character — produced adjacent values mod
 * twelve, so the live strip walked the area list one step a week and consecutive
 * weeks shared three of their four cards. Avalanching the last bits back through
 * the word decorrelates them.
 */
function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  return (h ^= h >>> 16) >>> 0
}

/** ISO-8601 week, whose year can differ from the date's around New Year. */
function isoWeek(date: Date): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Thursday decides the week's year, which is what makes 1 Jan fall correctly.
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7))
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((target.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * The seed a period resolves to. UTC throughout, so the set turns over at one
 * instant worldwide rather than sweeping around the timezones.
 */
export function periodSeed(period: SpotlightPeriod, date: Date = new Date()): string {
  return period === 'monthly'
    ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    : isoWeek(date)
}

export interface SpotlightPick {
  area: SpotlightArea
  collection: Collection
}

/**
 * One collection per area, for the areas this period puts forward.
 *
 * Rotates on two axes: which areas appear, and which of an area's collections
 * represents it. A reader who returns next week finds different subjects, not
 * just a different corner of the same one.
 */
export function spotlightPicks(
  collections: Collection[] | null | undefined,
  seed: string,
  count: number = AREAS_SHOWN,
): SpotlightPick[] {
  const bySlug = new Map(
    (collections ?? []).filter((c) => c.items.length >= MIN_ITEMS).map((c) => [c.name, c]),
  )
  if (!bySlug.size) return []

  // Areas the feed can actually fill. An area whose collections have all been
  // renamed away is skipped rather than rendering an empty card.
  const available = AREAS
    .map((area) => ({ area, options: area.collections.filter((slug) => bySlug.has(slug)) }))
    .filter(({ options }) => options.length > 0)
  if (!available.length) return []

  // Each area draws its own number and the lowest win, rather than taking a
  // window from a rotating offset. A window makes neighbouring periods overlap
  // by construction — a fresh draw per period does not.
  return available
    .map((entry) => ({ ...entry, roll: hash(`${seed}:${entry.area.slug}`) }))
    .sort((a, b) => a.roll - b.roll)
    .slice(0, count)
    .map(({ area, options, roll }) => ({
      area,
      // Reuses the area's own roll, so which collection it fields moves with it.
      collection: bySlug.get(options[roll % options.length])!,
    }))
}
