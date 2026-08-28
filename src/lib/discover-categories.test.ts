import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_OPTIONS, findCategory, topicOptions } from './discover-categories'

describe('categories', () => {
  it('gives every category a unique slug and a non-empty bundle', () => {
    const slugs = CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(CATEGORIES.every((c) => c.topics.length >= 5)).toBe(true)
  })

  it('uses only lowercase GitHub topic spellings', () => {
    // These strings go into queries verbatim; a capital or a space is a typo
    // that would silently return nothing.
    for (const category of CATEGORIES) {
      for (const topic of category.topics) expect(topic).toMatch(/^[a-z0-9][a-z0-9-]*$/)
    }
  })

  it('never repeats a topic inside one bundle', () => {
    for (const category of CATEGORIES) {
      expect(new Set(category.topics).size).toBe(category.topics.length)
    }
  })

  it('resolves a slug, and nothing else', () => {
    expect(findCategory('science')?.label).toBe('Science')
    expect(findCategory('nope')).toBeNull()
    expect(findCategory(null)).toBeNull()
  })

  it('carries the two planned Hidden Gems floor overrides', () => {
    expect(findCategory('ai')?.hiddenGemsFloor).toBe(200)
    expect(findCategory('science')?.hiddenGemsFloor).toBe(20)
    expect(findCategory('music')?.hiddenGemsFloor).toBeUndefined()
  })
})

describe('options', () => {
  it('offers every category behind an "all" default', () => {
    expect(CATEGORY_OPTIONS[0].value).toBe('all')
    expect(CATEGORY_OPTIONS).toHaveLength(CATEGORIES.length + 1)
  })

  it('offers every topic of a category behind an "all" default', () => {
    const science = findCategory('science')!

    const options = topicOptions(science)

    expect(options[0].value).toBe('all')
    expect(options.slice(1).map((o) => o.value)).toEqual(science.topics)
  })
})
