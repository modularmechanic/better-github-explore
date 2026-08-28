import { describe, expect, it } from 'vitest'
import { DEFAULT_LENS } from './discover-lenses'
import {
  DEFAULT_YEAR, packSelection, unpackSelection, validYear, YEARS,
} from './discover-selection'

describe('unpackSelection', () => {
  const lensOf = (param: string | null) => unpackSelection(param).lens.slug

  it('reads known slugs and falls back for unknown ones', () => {
    expect(lensOf('gold')).toBe('gold')
    expect(lensOf(null)).toBe(DEFAULT_LENS)
    expect(lensOf('nonsense')).toBe(DEFAULT_LENS)
    expect(lensOf('constructor')).toBe(DEFAULT_LENS)
  })

  it('reads a category and a topic that belongs to it', () => {
    const selection = unpackSelection('gems:science:physics')
    expect(selection.category?.slug).toBe('science')
    expect(selection.topic).toBe('physics')
  })

  it('drops unknown categories and mismatched topics independently', () => {
    expect(unpackSelection('gold:nonsense').category).toBeNull()
    expect(unpackSelection('gems:science:solidity').topic).toBeNull()
    expect(unpackSelection('gems::physics').topic).toBeNull()
  })
})

describe('Class selection', () => {
  it('offers whole years only, newest first, back to 2008', () => {
    expect(YEARS[0]).toBe(new Date().getUTCFullYear() - 1)
    expect(YEARS.at(-1)).toBe(2008)
  })

  it('clamps anything outside those whole years', () => {
    expect(validYear(2016)).toBe(2016)
    expect(validYear(1995)).toBe(DEFAULT_YEAR)
    expect(validYear(9999)).toBe(DEFAULT_YEAR)
    expect(validYear(undefined)).toBe(DEFAULT_YEAR)
    expect(validYear(new Date().getUTCFullYear())).toBe(DEFAULT_YEAR)
  })

  it('reads and round-trips year, maintenance and category', () => {
    const selection = unpackSelection('class-2016-maintained:crypto')
    expect(selection.lens.slug).toBe('class')
    expect(selection.year).toBe(2016)
    expect(selection.maintained).toBe(true)
    expect(selection.category?.slug).toBe('crypto')
    expect(packSelection(selection)).toBe('class-2016-maintained:crypto')
  })

  it('falls back for a missing or malformed year', () => {
    expect(unpackSelection('class').year).toBe(DEFAULT_YEAR)
    expect(unpackSelection('class-nonsense').lens.slug).toBe(DEFAULT_LENS)
  })
})

describe('packSelection', () => {
  const round = (param: string) => packSelection(unpackSelection(param))

  it('round-trips every depth and omits orphan topics', () => {
    expect(round('gems')).toBe('gems')
    expect(round('gems:science')).toBe('gems:science')
    expect(round('gems:science:physics')).toBe('gems:science:physics')
    expect(round('gems::physics')).toBe('gems')
  })
})
