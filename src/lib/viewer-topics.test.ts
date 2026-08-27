import { describe, expect, it } from 'vitest'
import { viewerTopics } from '@/lib/viewer-topics'
import type { Repo } from '@/types/github'

/** Only the two fields `viewerTopics` reads. */
const repo = (id: number, topics?: string[]) => ({ id, topics }) as Repo

describe('viewerTopics', () => {
  it('returns nothing for no repositories', () => {
    expect(viewerTopics([])).toEqual([])
  })

  it('counts a repository once even when it is both starred and watched', () => {
    // The two lists overlap heavily; counting by entry would double every
    // repository in both and let a single project fake an interest.
    const both = repo(1, ['react', 'typescript'])

    expect(viewerTopics([both, repo(2, ['react']), both], { min: 2 })).toEqual([
      { name: 'react', count: 2 },
    ])
  })

  it('skips repositories with no topics', () => {
    expect(viewerTopics([repo(1), repo(2, ['react']), repo(3, ['react'])])).toEqual([
      { name: 'react', count: 2 },
    ])
  })

  it('drops topics below min', () => {
    const repos = [repo(1, ['react', 'cli']), repo(2, ['react'])]

    expect(viewerTopics(repos)).toEqual([{ name: 'react', count: 2 }])
    expect(viewerTopics(repos, { min: 1 })).toEqual([
      { name: 'react', count: 2 },
      { name: 'cli', count: 1 },
    ])
  })

  it('breaks ties alphabetically so the order is stable', () => {
    const repos = [repo(1, ['vue', 'react', 'angular']), repo(2, ['vue', 'react', 'angular'])]

    expect(viewerTopics(repos).map((t) => t.name)).toEqual(['angular', 'react', 'vue'])
  })

  it('caps the result at limit, keeping the highest counts', () => {
    const repos = [repo(1, ['a', 'b', 'c']), repo(2, ['a', 'b', 'c']), repo(3, ['a'])]

    expect(viewerTopics(repos, { limit: 2 })).toEqual([
      { name: 'a', count: 3 },
      { name: 'b', count: 2 },
    ])
  })
})
