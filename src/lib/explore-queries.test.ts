import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { trendingQuery, upcomingEvents } from '@/lib/explore-queries'
import type { ResourceEvent } from '@/types/github'

const NOW = new Date('2024-03-10T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function event(over: Partial<ResourceEvent> = {}): ResourceEvent {
  return {
    title: 'Event',
    description: '',
    url: 'https://github.com/events/x',
    cta: 'Register',
    date: null,
    image: null,
    type: null,
    region: null,
    topic: null,
    availability: null,
    ...over,
  }
}

describe('trendingQuery', () => {
  it('builds the week query with a seven-day cutoff and its star floor', () => {
    expect(trendingQuery('week')).toBe('created:>2024-03-03 stars:>=50')
  })

  it('gives each window its own cutoff and star floor', () => {
    expect(trendingQuery('day')).toBe('created:>2024-03-09 stars:>=10')
    expect(trendingQuery('month')).toBe('created:>2024-02-09 stars:>=100')
  })
})

describe('upcomingEvents', () => {
  it('drops events already in the past', () => {
    const past = event({ url: 'past', date: '2024-03-01T00:00:00Z' })
    const future = event({ url: 'future', date: '2024-03-20T00:00:00Z' })

    expect(upcomingEvents([past, future]).map((e) => e.url)).toEqual(['future'])
  })

  it('drops events with no date', () => {
    const undated = event({ url: 'undated', date: null })
    const future = event({ url: 'future', date: '2024-03-20T00:00:00Z' })

    expect(upcomingEvents([undated, future]).map((e) => e.url)).toEqual(['future'])
  })

  it('sorts remaining events ascending by date', () => {
    const later = event({ url: 'later', date: '2024-04-01T00:00:00Z' })
    const sooner = event({ url: 'sooner', date: '2024-03-15T00:00:00Z' })

    expect(upcomingEvents([later, sooner]).map((e) => e.url)).toEqual(['sooner', 'later'])
  })
})
