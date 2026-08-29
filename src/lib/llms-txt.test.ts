import { describe, expect, it } from 'vitest'
import { buildLlmsTxt, buildSitemap, type LlmsTxtInput } from './llms-txt'

const input = (over: Partial<LlmsTxtInput> = {}): LlmsTxtInput => ({
  siteUrl: 'https://example.github.io/better-github-explore/',
  capturedAt: '2026-08-29T06:00:00.000Z',
  repos: [{ fullName: 'tt-a1i/archify', description: 'Diagrams.', language: 'JavaScript', stars: 27820 }],
  topics: [{ slug: 'awesome', name: 'Awesome Lists', description: 'Curated lists.' }],
  collections: ['made-in-brazil'],
  events: [{ title: 'Dev Days', url: 'https://github.com/events/dev-days', date: '2026-09-01T00:00:00Z' }],
  ...over,
})

describe('buildLlmsTxt', () => {
  it('opens with the llmstxt.org shape: H1, then a blockquote summary', () => {
    const lines = buildLlmsTxt(input()).split('\n')
    expect(lines[0]).toBe('# Better GitHub Explore')
    expect(lines.find((line) => line.startsWith('>'))).toBeTruthy()
  })

  it('links each repository to github.com and carries its stars and language', () => {
    expect(buildLlmsTxt(input())).toContain(
      '- [tt-a1i/archify](https://github.com/tt-a1i/archify): Diagrams. (27.8k stars, JavaScript)',
    )
  })

  // A description spanning lines would end the list item early and leave the
  // remainder parsed as prose, silently detaching it from its repository.
  it('flattens newlines and runs of whitespace in a description', () => {
    const out = buildLlmsTxt(input({
      repos: [{ fullName: 'a/b', description: 'One line.\nSecond   line.', language: null, stars: 12 }],
    }))
    expect(out).toContain('- [a/b](https://github.com/a/b): One line. Second line. (12 stars)')
  })

  it('still produces a usable line for a repository with no description', () => {
    const out = buildLlmsTxt(input({
      repos: [{ fullName: 'a/b', description: null, language: null, stars: 0 }],
    }))
    expect(out).toContain('- [a/b](https://github.com/a/b): No description. (0 stars)')
  })

  // A broken scraper should read as a missing section, not as a heading
  // promising rows that never arrived.
  it('drops a section entirely rather than leaving an empty heading', () => {
    const out = buildLlmsTxt(input({ topics: [], collections: [], events: [] }))
    expect(out).toContain('## Trending repositories')
    expect(out).not.toContain('## Topics')
    expect(out).not.toContain('## Collections')
    expect(out).not.toContain('## Events')
  })

  it('says when the snapshot was taken, so stale numbers are not read as live', () => {
    expect(buildLlmsTxt(input())).toContain('2026-08-29T06:00:00.000Z')
  })

  it('normalises a site URL given without its trailing slash', () => {
    const out = buildLlmsTxt(input({ siteUrl: 'https://example.github.io/better-github-explore' }))
    expect(out).toContain('https://example.github.io/better-github-explore/')
    expect(out).not.toContain('exploreto#/trending')
  })
})

describe('buildSitemap', () => {
  it('lists the one URL that actually exists, dated', () => {
    const xml = buildSitemap({ siteUrl: 'https://example.github.io/app/', lastmod: '2026-08-29T06:00:00.000Z' })
    expect(xml).toContain('<loc>https://example.github.io/app/</loc>')
    expect(xml).toContain('<lastmod>2026-08-29</lastmod>')
    expect(xml.match(/<url>/g)?.length).toBe(1)
  })

  it('escapes a URL that would otherwise break the XML', () => {
    const xml = buildSitemap({ siteUrl: 'https://e.com/a?x=1&y=2/', lastmod: '2026-08-29' })
    expect(xml).toContain('&amp;')
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;)/)
  })
})
