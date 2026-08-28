import { describe, expect, it } from 'vitest'
import { isListRepo, LENSES, LENS_OPTIONS } from './discover-lenses'
import { DEFAULT_YEAR } from './discover-selection'
import type { Repo } from '@/types/github'

const repo = (over: Partial<Repo> = {}): Repo => ({
  id: 1,
  name: 'thing',
  full_name: 'owner/thing',
  html_url: 'https://github.com/owner/thing',
  description: null,
  owner: { login: 'owner', avatar_url: '', html_url: '' },
  stargazers_count: 100,
  forks_count: 10,
  open_issues_count: 0,
  language: 'TypeScript',
  license: null,
  created_at: new Date(Date.now() - 100 * 86_400_000).toISOString(),
  pushed_at: new Date().toISOString(),
  ...over,
})

/** Anchored: an unanchored form also matches inside a full ISO timestamp. */
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/

describe('queries', () => {
  it('excludes forks from every lens', () => {
    for (const lens of Object.values(LENSES)) {
      expect(lens.query(DEFAULT_YEAR)).toContain('fork:false')
    }
  })

  it('excludes archived repositories everywhere except Sleeping Giants', () => {
    // That lens is looking for abandoned projects, and an archived one is the
    // purest case of its subject — so the exception is the feature.
    for (const lens of Object.values(LENSES)) {
      if (lens.slug === 'giants') expect(lens.query(DEFAULT_YEAR)).not.toContain('archived:')
      else expect(lens.query(DEFAULT_YEAR)).toContain('archived:false')
    }
  })

  it('rounds every relative date to the day, so a lens keeps one cache key', () => {
    // A timestamp would change the query — and so the cache key — on every
    // render. The date is asserted anchored, and the clause count is asserted
    // too: a query whose dates stopped matching at all would otherwise make
    // this loop vacuous and keep it green.
    let clauses = 0
    for (const lens of Object.values(LENSES)) {
      for (const [, date] of lens.query(DEFAULT_YEAR).matchAll(/(?:created|pushed):[<>]([^\s]+)/g)) {
        expect(date).toMatch(DAY_ONLY)
        clauses++
      }
    }
    // gems 1, rising 1, gold 2, fresh 1, solid 1, giants 1, hungry 1.
    expect(clauses).toBe(8)
  })

  it('keeps every lens to a single request-worth of results', () => {
    // Behaviour, not tuning: the whole budget claim rests on one page per view.
    for (const lens of Object.values(LENSES)) {
      expect(['stars', 'updated']).toContain(lens.sort)
    }
  })

  it('bounds Hidden Gems below the popular repositories at both ends', () => {
    // A floor with no ceiling would just be "popular repositories".
    const [, low, high] = LENSES.gems.query(DEFAULT_YEAR).match(/stars:(\d+)\.\.(\d+)/)!
    expect(Number(low)).toBeGreaterThan(0)
    expect(Number(high)).toBeLessThan(5000)
  })

  it('requires forks of Rising Stars, so bought stars do not qualify', () => {
    expect(LENSES.rising.query(DEFAULT_YEAR)).toContain('forks:>10')
  })

  it('sorts Old But Gold by push date, or its star ceiling is unreachable', () => {
    // Sorted by stars, the hundred returned ran 49k-78k — the household names
    // the lens exists to look past — and the lower bound was never reached.
    expect(LENSES.gold.sort).toBe('updated')
    expect(LENSES.gold.query(DEFAULT_YEAR)).toContain('created:<2018-01-01')
  })

  it('sorts Hidden Gems by push date, so the set keeps turning over', () => {
    expect(LENSES.gems.sort).toBe('updated')
  })
})

describe('isListRepo', () => {
  it('catches reading lists by name', () => {
    expect(isListRepo(repo({ name: 'awesome-rust' }))).toBe(true)
    expect(isListRepo(repo({ name: 'developer-roadmap' }))).toBe(true)
    expect(isListRepo(repo({ name: 'js-cheatsheet' }))).toBe(true)
    expect(isListRepo(repo({ name: 'coding-interview-university' }))).toBe(true)
  })

  it('treats a repository with no detected language as not-software', () => {
    expect(isListRepo(repo({ language: null }))).toBe(true)
  })

  it('catches the big lists that hide behind a software-shaped name', () => {
    // All three led Rock Solid against the live API: names that look like
    // programs, descriptions that admit they are catalogues.
    expect(isListRepo(repo({ name: 'public-apis', description: 'A collective list of free APIs' }))).toBe(true)
    expect(isListRepo(repo({ name: 'freeCodeCamp', description: "freeCodeCamp.org's open-source codebase and curriculum" }))).toBe(true)
    expect(isListRepo(repo({ name: 'project-based-learning', description: 'Curated list of project-based tutorials' }))).toBe(true)
  })

  it('leaves ordinary software alone', () => {
    expect(isListRepo(repo({ name: 'ripgrep' }))).toBe(false)
  })

  it('does not cull software whose description merely contains the word list', () => {
    // The reason the pattern wants a noun phrase and not the bare word.
    expect(isListRepo(repo({ name: 'todo', description: 'A fast task list manager for the terminal' }))).toBe(false)
    expect(isListRepo(repo({ name: 'linked', description: 'Intrusive linked list and collection primitives' }))).toBe(false)
    expect(isListRepo(repo({ name: 'tut', description: 'A TUI for Mastodon with vim key bindings' }))).toBe(false)
  })

  it('survives a repository with no description at all', () => {
    expect(isListRepo(repo({ description: null }))).toBe(false)
  })
})

describe('lens ranking', () => {
  const rank = LENSES.gems.rank!

  it('ranks by stars per day, not by raw stars', () => {
    const old = repo({ id: 1, stargazers_count: 1000, created_at: new Date(Date.now() - 1000 * 86_400_000).toISOString() })
    const young = repo({ id: 2, stargazers_count: 500, created_at: new Date(Date.now() - 10 * 86_400_000).toISOString() })

    expect(rank([old, young]).map((r) => r.id)).toEqual([2, 1])
  })

  it('leaves Old But Gold in the order GitHub returned it', () => {
    // Stars-per-day is meaningless across a decade, so this lens takes the
    // server's ordering — which is why it has no rank function at all.
    expect(LENSES.gold.rank).toBeUndefined()
    expect(LENSES.fresh.rank).toBeUndefined()
  })

  it('does not reorder the array it was given', () => {
    // A cache hit hands every caller the same array; sorting it in place here
    // would reorder somebody else's results.
    const input = [
      repo({ id: 1, stargazers_count: 10 }),
      repo({ id: 2, stargazers_count: 10_000 }),
    ]

    rank(input)

    expect(input.map((r) => r.id)).toEqual([1, 2])
  })
})

describe('LENS_OPTIONS', () => {
  it('offers every lens, labelled', () => {
    expect(LENS_OPTIONS.map((o) => o.value)).toEqual(Object.keys(LENSES))
    expect(LENS_OPTIONS.every((o) => o.label.length > 0)).toBe(true)
  })

  it('keeps the rail short enough to read as a row of buttons', () => {
    // The rail is a Segmented control, not a dropdown. Past about eight it
    // wraps into an unreadable block on a phone.
    expect(LENS_OPTIONS.length).toBeLessThanOrEqual(8)
  })
})

describe('the Class lens and its year', () => {
  it('asks for one whole calendar year', () => {
    expect(LENSES.class.query(2016)).toContain('created:2016-01-01..2016-12-31')
  })

  it('can narrow the class to repositories still maintained this year', () => {
    expect(LENSES.class.query(2016, false)).not.toContain('pushed:>')
    expect(LENSES.class.query(2016, true)).toMatch(/pushed:>\d{4}-\d{2}-\d{2}/)
  })

})
