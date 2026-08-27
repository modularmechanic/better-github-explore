import { describe, expect, it } from 'vitest'
import { eventOptions, filterEvents } from './events'
import type { ResourceEvent } from '@/types/github'

const NOW = Date.parse('2026-06-15T12:00:00Z')

const event = (title: string, over: Partial<ResourceEvent> = {}): ResourceEvent => ({
  title,
  description: '',
  url: `https://example.test/${title}`,
  cta: 'Register',
  date: null,
  image: null,
  type: null,
  region: null,
  topic: null,
  availability: null,
  ...over,
})

const past = event('past', { date: '2026-01-01T00:00:00Z' })
const soon = event('soon', { date: '2026-07-01T00:00:00Z' })
const later = event('later', { date: '2026-09-01T00:00:00Z' })
const onDemand = event('on-demand')

const titles = (list: ResourceEvent[]) => list.map((e) => e.title)

describe('the time filter', () => {
  it('keeps only what is still ahead, soonest first', () => {
    const kept = filterEvents([later, past, soon], { when: 'upcoming' }, NOW)

    expect(titles(kept)).toEqual(['soon', 'later'])
  })

  it('flips the sort direction for past events, most recent first', () => {
    const older = event('older', { date: '2025-01-01T00:00:00Z' })
    const kept = filterEvents([older, past, soon], { when: 'past' }, NOW)

    expect(titles(kept)).toEqual(['past', 'older'])
  })

  it('keeps on-demand content in the upcoming filter, since it has no date', () => {
    expect(titles(filterEvents([onDemand, past], { when: 'upcoming' }, NOW)))
      .toContain('on-demand')
  })

  it('excludes on-demand content from the past filter', () => {
    expect(titles(filterEvents([onDemand, past], { when: 'past' }, NOW))).toEqual(['past'])
  })

  it('sorts undated entries last when everything is shown', () => {
    expect(titles(filterEvents([onDemand, soon], { when: 'all' }, NOW)))
      .toEqual(['soon', 'on-demand'])
  })

  it('defaults to upcoming', () => {
    expect(titles(filterEvents([past, soon], {}, NOW))).toEqual(['soon'])
  })
})

describe('the facet filters', () => {
  const workshop = event('workshop', { date: soon.date, type: 'Workshop', region: 'EMEA', topic: 'AI' })
  const webinar = event('webinar', { date: soon.date, type: 'Webinar', region: 'AMER', topic: 'DevOps' })

  it('narrows by type, region and topic independently', () => {
    const all = [workshop, webinar]

    expect(titles(filterEvents(all, { type: 'Workshop' }, NOW))).toEqual(['workshop'])
    expect(titles(filterEvents(all, { region: 'AMER' }, NOW))).toEqual(['webinar'])
    expect(titles(filterEvents(all, { topic: 'AI' }, NOW))).toEqual(['workshop'])
  })

  it('treats "any" as no filter at all', () => {
    const kept = filterEvents([workshop, webinar], { type: 'any', region: 'any', topic: 'any' }, NOW)

    expect(kept).toHaveLength(2)
  })

  it('searches title, description, topic and region', () => {
    expect(titles(filterEvents([workshop, webinar], { search: 'emea' }, NOW))).toEqual(['workshop'])
  })
})

describe('eventOptions', () => {
  it('offers only the values present in the data, sorted, behind an "any" entry', () => {
    const events = [
      event('a', { region: 'EMEA' }),
      event('b', { region: 'AMER' }),
      event('c', { region: 'EMEA' }),
    ]

    expect(eventOptions(events, 'region', 'Any region')).toEqual([
      { value: 'any', label: 'Any region' },
      { value: 'AMER', label: 'AMER' },
      { value: 'EMEA', label: 'EMEA' },
    ])
  })

  it('drops nulls rather than offering a blank option', () => {
    expect(eventOptions([event('a'), event('b', { type: 'Webinar' })], 'type', 'Anywhere')).toEqual([
      { value: 'any', label: 'Anywhere' },
      { value: 'Webinar', label: 'Webinar' },
    ])
  })
})
