/** The deep-linkable state of one Discover result set. */
import { findCategory, type Category } from '@/lib/discover-categories'
import { DEFAULT_LENS, LENSES, type Lens, type LensSlug } from '@/lib/discover-lenses'

/** GitHub's first full year, and the earliest the time machine offers. */
const FIRST_YEAR = 2008

/** Old enough to have a verdict on it, recent enough to still run. */
export const DEFAULT_YEAR = 2018

/** Whole years only: a part-year class would not be one. */
export const YEARS: number[] = (() => {
  const last = new Date().getUTCFullYear() - 1
  return Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => last - i)
})()

/** Clamps anything a hand-edited URL might carry to a year we actually offer. */
export const validYear = (year: number | string | undefined): number =>
  YEARS.includes(Number(year)) ? Number(year) : DEFAULT_YEAR

/** Everything one Discover view asks the API for. */
export interface Selection {
  lens: Lens
  /** Only the Class lens reads this; the others carry the default unused. */
  year: number
  /** Only Class reads this; encoded because it changes the network query. */
  maintained: boolean
  category: Category | null
  /** One topic inside the category, or null for the whole bundle. */
  topic: string | null
}

/**
 * Every axis that costs a request is in the URL: lens, Class year/state,
 * category and topic. In-memory text and language filters deliberately are not.
 */
export const packSelection = ({ lens, year, maintained, category, topic }: Selection): string => {
  const head = lens.slug === 'class'
    ? `class-${year}${maintained ? '-maintained' : ''}`
    : lens.slug
  return [head, category?.slug, category && topic].filter(Boolean).join(':')
}

/** The reverse, tolerant of anything: every part falls back on its own. */
export function unpackSelection(param: string | null): Selection {
  const [lensPart = '', categoryPart, topicPart] = (param ?? '').split(':')
  const classPart = lensPart.match(/^class-(\d{4})(-maintained)?$/)
  const head = classPart ? 'class' : lensPart
  // `in` also accepts inherited keys such as `constructor`.
  const slug = Object.hasOwn(LENSES, head) ? (head as LensSlug) : DEFAULT_LENS
  const category = findCategory(categoryPart ?? null)
  return {
    lens: LENSES[slug],
    year: validYear(classPart?.[1]),
    maintained: Boolean(classPart?.[2]),
    category,
    topic: category?.topics.includes(topicPart) ? topicPart : null,
  }
}
