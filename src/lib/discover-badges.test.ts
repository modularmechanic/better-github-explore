import { describe, expect, it } from 'vitest'
import { badgesFor } from './discover-badges'
import type { Repo } from '@/types/github'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

const repo = (over: Partial<Repo> = {}): Repo => ({
  id: 1,
  name: 'thing',
  full_name: 'owner/thing',
  html_url: '',
  description: null,
  owner: { login: 'owner', avatar_url: '', html_url: '' },
  stargazers_count: 100,
  forks_count: 1,
  open_issues_count: 0,
  language: 'Go',
  license: null,
  created_at: daysAgo(400),
  pushed_at: daysAgo(1),
  ...over,
})

const labels = (over: Partial<Repo>) => badgesFor(repo(over)).map((b) => b.label)

describe('badgesFor', () => {
  it('says nothing about an ordinary repository', () => {
    // Silence is the default: the card already shows stars, forks and age.
    expect(labels({})).toEqual([])
  })

  it('flags an archived repository, which nothing else on the card would', () => {
    expect(labels({ archived: true })).toContain('Archived')
  })

  it('flags one created inside the last month', () => {
    expect(labels({ created_at: daysAgo(3) })).toContain('New')
  })

  it('does not call a two-month-old repository new', () => {
    expect(labels({ created_at: daysAgo(60) })).not.toContain('New')
  })

  it('can say both at once', () => {
    expect(labels({ archived: true, created_at: daysAgo(2) })).toEqual(['Archived', 'New'])
  })

  it('treats a missing archived flag as not archived', () => {
    // Only search results carry it; other endpoints may not.
    expect(labels({ archived: undefined })).toEqual([])
  })

  it('explains every badge it renders', () => {
    // They sit in a dense kicker row — an unexplained word there is noise.
    for (const badge of badgesFor(repo({ archived: true, created_at: daysAgo(1) }))) {
      expect(badge.title.length).toBeGreaterThan(10)
    }
  })
})
