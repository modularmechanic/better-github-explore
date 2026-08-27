import { describe, expect, it } from 'vitest'
import { curationScore, rankTopics, topicMatches } from './topics'
import type { Topic } from '@/types/github'

const topic = (over: Partial<Topic> & { topic_name: string }): Topic => ({
  display_name: null,
  short_description: null,
  content: null,
  logo: null,
  released: null,
  created_by: null,
  url: null,
  related: [],
  aliases: [],
  ...over,
})

const names = (topics: Topic[]) => topics.map((t) => t.topic_name)

describe('curationScore', () => {
  it('scores a bare slug at zero', () => {
    expect(curationScore(topic({ topic_name: 'bare' }))).toBe(0)
  })

  it('weights a logo above any single text field', () => {
    expect(curationScore(topic({ topic_name: 'a', logo: 'a.png' }))).toBe(2)
    expect(curationScore(topic({ topic_name: 'b', short_description: 'x' }))).toBe(1)
  })

  it('sums every editorial signal', () => {
    const full = topic({
      topic_name: 'full',
      logo: 'a.png',
      short_description: 'x',
      released: '2015',
      created_by: 'someone',
    })

    expect(curationScore(full)).toBe(5)
  })
})

describe('topicMatches', () => {
  it('matches an alias, not just the slug and title', () => {
    const react = topic({ topic_name: 'react', aliases: ['reactjs', 'react-js'] })

    expect(topicMatches(react, 'reactjs')).toBe(true)
  })

  it('keeps everything when the search box is empty', () => {
    expect(topicMatches(topic({ topic_name: 'anything' }), '')).toBe(true)
  })
})

describe('rankTopics', () => {
  const curated = topic({ topic_name: 'curated', logo: 'a.png', short_description: 'x' })
  const bare = topic({ topic_name: 'bare' })
  const zzz = topic({ topic_name: 'zzz' })

  it('puts better-curated topics first by default', () => {
    expect(names(rankTopics([bare, curated]))).toEqual(['curated', 'bare'])
  })

  it('breaks a curation tie by name, so the order is stable between renders', () => {
    expect(names(rankTopics([zzz, bare]))).toEqual(['bare', 'zzz'])
  })

  it('sorts A-Z on request, ignoring curation', () => {
    expect(names(rankTopics([curated, bare, zzz], { sort: 'az' }))).toEqual([
      'bare',
      'curated',
      'zzz',
    ])
  })

  it('sorts A-Z by display name where there is one', () => {
    const alpha = topic({ topic_name: 'zzz', display_name: 'Alpha' })

    expect(names(rankTopics([bare, alpha], { sort: 'az' }))).toEqual(['zzz', 'bare'])
  })

  it('floats favourites above everything, in either order', () => {
    expect(names(rankTopics([curated, bare], { favourites: ['bare'] }))).toEqual([
      'bare',
      'curated',
    ])
    expect(names(rankTopics([curated, bare], { sort: 'az', favourites: ['zzz', 'curated'] })))
      .toEqual(['curated', 'bare'])
  })

  it('narrows to favourites only when asked', () => {
    const ranked = rankTopics([curated, bare], { favourites: ['bare'], favouritesOnly: true })

    expect(names(ranked)).toEqual(['bare'])
  })

  it('applies the search box before the ordering', () => {
    expect(names(rankTopics([curated, bare, zzz], { search: 'z' }))).toEqual(['zzz'])
  })

  it('does not reorder the array it was given', () => {
    const input = [bare, curated]

    rankTopics(input)

    expect(names(input)).toEqual(['bare', 'curated'])
  })
})
