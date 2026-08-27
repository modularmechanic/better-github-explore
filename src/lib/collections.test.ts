import { describe, expect, it } from 'vitest'
import {
  collectionMatches, collectionOrder, collectionsForViewer, largestIn, rankCollections,
} from './collections'
import type { Collection, Repo } from '@/types/github'

const collection = (name: string, items: string[] = [], over: Partial<Collection> = {}): Collection => ({
  name,
  display_name: null,
  content: null,
  image: null,
  created_by: null,
  items,
  ...over,
})

const repo = (fullName: string): Repo =>
  ({ id: fullName.length, full_name: fullName }) as Repo

const names = (list: Collection[]) => list.map((c) => c.name)

describe('collectionOrder', () => {
  it('ranks by position in the snapshot', () => {
    const rank = collectionOrder(['b', 'a'])

    expect(rank('b')).toBe(0)
    expect(rank('a')).toBe(1)
  })

  it('sends anything the snapshot does not name to the back', () => {
    const rank = collectionOrder(['a'])

    expect(rank('unknown')).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('is a constant when the snapshot is empty, leaving the size ordering to decide', () => {
    const rank = collectionOrder([])

    expect(rank('a')).toBe(rank('b'))
  })
})

describe('rankCollections', () => {
  const big = collection('big', ['a/1', 'a/2', 'a/3'])
  const small = collection('small', ['b/1'])

  it('falls back to biggest-first with no snapshot order', () => {
    expect(names(rankCollections([small, big]))).toEqual(['big', 'small'])
  })

  it('prefers the snapshot order over size', () => {
    const rank = collectionOrder(['small', 'big'])

    expect(names(rankCollections([big, small], { rank }))).toEqual(['small', 'big'])
  })

  it('floats favourites above the snapshot order', () => {
    const rank = collectionOrder(['big', 'small'])

    expect(names(rankCollections([big, small], { rank, favourites: ['small'] })))
      .toEqual(['small', 'big'])
  })

  it('searches the repository names inside a collection, not just its title', () => {
    expect(names(rankCollections([big, small], { search: 'b/1' }))).toEqual(['small'])
  })

  it('searches the description with its HTML stripped', () => {
    const rich = collection('rich', [], { content: '<p>machine <em>learning</em></p>' })

    expect(names(rankCollections([rich], { search: 'machine learning' }))).toEqual(['rich'])
  })

  it('narrows to favourites only when asked', () => {
    const ranked = rankCollections([big, small], { favourites: ['small'], favouritesOnly: true })

    expect(names(ranked)).toEqual(['small'])
  })
})

describe('collectionsForViewer', () => {
  const react = collection('react', ['facebook/react', 'vercel/next.js'])
  const rust = collection('rust', ['rust-lang/rust'])

  it('ranks by how many of the viewer\'s repositories a collection contains', () => {
    const mine = [repo('facebook/react'), repo('vercel/next.js'), repo('rust-lang/rust')]

    expect(names(collectionsForViewer([rust, react], mine))).toEqual(['react', 'rust'])
  })

  it('matches regardless of casing on either side', () => {
    // GitHub's casing is not guaranteed to agree between the feed payload and
    // the /user/* payloads; a case-sensitive compare returns an empty section.
    const mine = [repo('Facebook/React')]

    expect(names(collectionsForViewer([react], mine))).toEqual(['react'])
  })

  it('drops collections with no overlap at all', () => {
    expect(collectionsForViewer([react, rust], [repo('rust-lang/rust')])).toEqual([rust])
  })

  it('returns nothing when the viewer follows nothing', () => {
    expect(collectionsForViewer([react], [])).toEqual([])
  })

  it('returns every overlapping collection, so the caller can search before capping', () => {
    // Capping here would hide a collection that matches the search box but
    // ranks below the cap by overlap — the caller narrows, then slices.
    const many = Array.from({ length: 8 }, (_, i) =>
      collection(`c${i}`, ['owner/shared']))
    const mine = [repo('owner/shared')]

    expect(collectionsForViewer(many, mine)).toHaveLength(8)
  })

  it('leaves the ordering to overlap alone, for the caller to preserve', () => {
    const two = collection('two', ['a/1', 'a/2'])
    const one = collection('one', ['a/1', 'b/9'])
    const mine = [repo('a/1'), repo('a/2')]

    expect(names(collectionsForViewer([one, two], mine))).toEqual(['two', 'one'])
  })
})

describe('collectionMatches', () => {
  // Every list of collections shares this, so the same term cannot show a
  // collection in one section and hide it in another.
  const c = collection('react', ['facebook/react'], {
    display_name: 'React',
    content: '<p>A <em>declarative</em> UI library</p>',
  })

  it('matches the slug and the display name', () => {
    expect(collectionMatches(c, 'react')).toBe(true)
    expect(collectionMatches(c, 'React')).toBe(true)
  })

  it('matches a repository name inside the collection', () => {
    expect(collectionMatches(c, 'facebook/react')).toBe(true)
  })

  it('matches the description with its HTML stripped', () => {
    expect(collectionMatches(c, 'declarative UI')).toBe(true)
  })

  it('does not match an unrelated term', () => {
    expect(collectionMatches(c, 'kubernetes')).toBe(false)
  })

  it('keeps everything for an empty search box', () => {
    expect(collectionMatches(c, '')).toBe(true)
  })
})

describe('largestIn', () => {
  it('reports the biggest collection', () => {
    expect(largestIn([collection('a', ['x']), collection('b', ['x', 'y'])])).toBe(2)
  })

  it('floors at 1, so an empty set cannot divide by zero', () => {
    expect(largestIn([])).toBe(1)
    expect(largestIn([collection('empty')])).toBe(1)
  })
})
