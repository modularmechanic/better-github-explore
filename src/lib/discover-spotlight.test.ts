import { describe, expect, it } from 'vitest'
import {
  AREAS, AREAS_SHOWN, periodSeed, spotlightPicks, type SpotlightPeriod,
} from './discover-spotlight'
import type { Collection } from '@/types/github'

const collection = (name: string, items = 6): Collection => ({
  name,
  display_name: name,
  content: null,
  image: null,
  created_by: null,
  items: Array.from({ length: items }, (_, i) => `owner/${name}-${i}`),
})

/** Stands in for the live feed: every collection every area names. */
const feed = AREAS.flatMap((area) => area.collections).map((slug) => collection(slug))

const areasFor = (seed: string) => spotlightPicks(feed, seed).map((p) => p.area.slug)
const namesFor = (seed: string) => spotlightPicks(feed, seed).map((p) => p.collection.name)

describe('areas', () => {
  it('never lists one collection under two areas', () => {
    // A period would otherwise be able to show the same card twice.
    const all = AREAS.flatMap((a) => a.collections)
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives every area a unique slug and something to show', () => {
    expect(new Set(AREAS.map((a) => a.slug)).size).toBe(AREAS.length)
    expect(AREAS.every((a) => a.collections.length > 0)).toBe(true)
  })

  it('has more areas than it shows at once, or nothing would rotate', () => {
    expect(AREAS.length).toBeGreaterThan(AREAS_SHOWN)
  })
})

describe('spotlightPicks', () => {
  it('shows several different areas at once, not one subject', () => {
    // The bug this replaced: a flat draw spent a whole period on Minecraft.
    const picks = spotlightPicks(feed, '2026-W35')

    expect(picks).toHaveLength(AREAS_SHOWN)
    expect(new Set(picks.map((p) => p.area.slug)).size).toBe(AREAS_SHOWN)
  })

  it('draws each area collection from that area, never from another', () => {
    for (const { area, collection: picked } of spotlightPicks(feed, '2026-W35')) {
      expect(area.collections).toContain(picked.name)
    }
  })

  it('gives the same answer for the same period', () => {
    expect(namesFor('2026-W35')).toEqual(namesFor('2026-W35'))
  })

  it('moves to different areas as the periods advance', () => {
    const weeks = ['2026-W35', '2026-W36', '2026-W37', '2026-W38'].map(areasFor)
    const first = weeks.map((w) => w[0])

    expect(new Set(first).size).toBeGreaterThan(1)
  })

  it('does not reuse most of the previous week areas', () => {
    // Measured against the live feed, the first cut walked the area list one
    // step a week: consecutive weeks shared three of their four cards, so the
    // strip felt static even though it was technically rotating.
    const weeks = Array.from({ length: 12 }, (_, i) =>
      areasFor(`2026-W${String(i + 20).padStart(2, '0')}`))

    const overlaps = weeks.slice(1).map((week, i) =>
      week.filter((slug) => weeks[i].includes(slug)).length)

    expect(Math.max(...overlaps)).toBeLessThan(AREAS_SHOWN)
    const mean = overlaps.reduce((a, b) => a + b, 0) / overlaps.length
    expect(mean).toBeLessThanOrEqual(AREAS_SHOWN / 2)
  })

  it('covers every area over enough periods, rather than favouring a few', () => {
    const seen = new Set<string>()
    for (let week = 1; week <= 52; week++) {
      for (const slug of areasFor(`2026-W${String(week).padStart(2, '0')}`)) seen.add(slug)
    }

    expect(seen.size).toBe(AREAS.length)
  })

  it('skips collections too thin to fill a card', () => {
    const thin = AREAS[0].collections.map((slug) => collection(slug, 1))

    expect(spotlightPicks(thin, '2026-W35')).toEqual([])
  })

  it('skips an area whose collections are missing from the feed', () => {
    // A renamed collection must not leave a blank card behind.
    const partial = AREAS[1].collections.map((slug) => collection(slug))

    const picks = spotlightPicks(partial, '2026-W35')

    expect(picks).toHaveLength(1)
    expect(picks[0].area.slug).toBe(AREAS[1].slug)
  })

  it('returns nothing rather than throwing on an empty or absent feed', () => {
    expect(spotlightPicks([], '2026-W35')).toEqual([])
    expect(spotlightPicks(null, '2026-W35')).toEqual([])
    expect(spotlightPicks(undefined, '2026-W35')).toEqual([])
  })
})

describe('periodSeed', () => {
  const at = (iso: string, period: SpotlightPeriod) => periodSeed(period, new Date(iso))

  it('holds steady inside a week and turns over between them', () => {
    expect(at('2026-08-24T00:00:00Z', 'weekly')).toBe(at('2026-08-30T23:59:59Z', 'weekly'))
    expect(at('2026-08-30T23:59:59Z', 'weekly')).not.toBe(at('2026-08-31T00:00:00Z', 'weekly'))
  })

  it('holds steady inside a month and turns over between them', () => {
    expect(at('2026-08-01T00:00:00Z', 'monthly')).toBe(at('2026-08-31T23:59:59Z', 'monthly'))
    expect(at('2026-08-31T23:59:59Z', 'monthly')).not.toBe(at('2026-09-01T00:00:00Z', 'monthly'))
  })

  it('gives a monthly reader one set where a weekly reader gets four', () => {
    const august = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24']
    expect(new Set(august.map((d) => at(d + 'T12:00:00Z', 'monthly'))).size).toBe(1)
    expect(new Set(august.map((d) => at(d + 'T12:00:00Z', 'weekly'))).size).toBe(4)
  })

  it('puts a new year opening days in the week that owns them', () => {
    // 2027-01-01 is a Friday, so ISO-8601 counts it in 2026's final week.
    expect(at('2027-01-01T00:00:00Z', 'weekly')).toBe('2026-W53')
  })

  it('pads the week so seeds sort and compare as plain strings', () => {
    expect(at('2026-01-08T00:00:00Z', 'weekly')).toMatch(/^\d{4}-W\d{2}$/)
  })
})
