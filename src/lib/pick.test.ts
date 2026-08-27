import { describe, expect, it } from 'vitest'
import { pick } from './pick'

describe('pick', () => {
  it('takes the first N', () => {
    expect(pick([1, 2, 3, 4], 2)).toEqual([1, 2])
  })

  it('filters before slicing, so the teaser is N matches and not N candidates', () => {
    expect(pick([1, 2, 3, 4, 5, 6], 2, (n) => n % 2 === 0)).toEqual([2, 4])
  })

  it('stays null for a list that has not loaded', () => {
    // The distinction that matters: null keeps AsyncGrid on skeletons, whereas
    // an empty array would render "Nothing matched" while the request is still
    // in flight.
    expect(pick(null, 3)).toBeNull()
    expect(pick(undefined, 3)).toBeNull()
  })

  it('returns an empty array when a loaded list matches nothing', () => {
    expect(pick([1, 2], 3, () => false)).toEqual([])
  })

  it('does not modify the list it was given', () => {
    const input = [3, 1, 2]

    pick(input, 2)

    expect(input).toEqual([3, 1, 2])
  })
})
