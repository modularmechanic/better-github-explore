import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repo } from '@/types/github'
import { extractMedia, fetchReadme, resolveLinks } from './readme'

// Only full_name is read, so a stub beats a 14-field fixture.
const repo = { full_name: 'octocat/hello' } as Repo
const RAW = 'https://raw.githubusercontent.com/octocat/hello/HEAD'
const VIDEO_ID = 'dQw4w9WgXcQ'

describe('extractMedia', () => {
  it('returns null for an empty README', () => {
    expect(extractMedia('', repo)).toBeNull()
  })

  it('resolves a relative image against the raw host', () => {
    expect(extractMedia('# Hi\n\n![hero](./docs/hero.png)', repo)).toEqual({
      kind: 'image',
      src: `${RAW}/docs/hero.png`,
      href: `${RAW}/docs/hero.png`,
    })
  })

  it('upgrades a protocol-relative image to https', () => {
    expect(extractMedia('![cdn](//cdn.example.com/a.png)', repo)?.src).toBe(
      'https://cdn.example.com/a.png',
    )
  })

  it('reads an <img> tag src', () => {
    expect(extractMedia('<img src="assets/screen.png" width="400">', repo)?.src).toBe(
      `${RAW}/assets/screen.png`,
    )
  })

  it('skips badges in favour of real content further down', () => {
    const markdown = `# Project
[![build](https://img.shields.io/badge/build-passing-green.svg)](https://ci.example)
![coverage](https://codecov.io/gh/octocat/hello/branch/main/graph/badge.svg)

![screenshot](docs/screenshot.png)`
    expect(extractMedia(markdown, repo)?.src).toBe(`${RAW}/docs/screenshot.png`)
  })

  it('returns null when the only image is a badge', () => {
    expect(extractMedia('![b](https://img.shields.io/badge/a-b.svg)', repo)).toBeNull()
  })

  it('prefers a YouTube link that appears before any image', () => {
    expect(extractMedia(`Watch: https://youtu.be/${VIDEO_ID}\n\n![shot](shot.png)`, repo)).toEqual({
      kind: 'youtube',
      src: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
      href: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    })
  })

  it('prefers an image that appears before a YouTube link', () => {
    const markdown = `![shot](shot.png)\n\nhttps://youtu.be/${VIDEO_ID}`
    expect(extractMedia(markdown, repo)?.kind).toBe('image')
  })

  it.each([
    `https://youtu.be/${VIDEO_ID}`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
  ])('parses the video id out of %s', (link) => {
    expect(extractMedia(`See ${link} for a demo`, repo)?.href).toBe(
      `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    )
  })
})

describe('resolveLinks', () => {
  it('rewrites relative image targets and leaves absolute ones alone', () => {
    const markdown = `![a](img/a.png) <img src='img/b.png'> ![c](https://cdn.example/c.png) ![d](//cdn.example/d.png)`
    expect(resolveLinks(markdown, repo)).toBe(
      `![a](${RAW}/img/a.png) <img src='${RAW}/img/b.png'> ![c](https://cdn.example/c.png) ![d](https://cdn.example/d.png)`,
    )
  })

  // Only image targets are rewritten; a relative doc link stays a repo-relative link.
  it('leaves non-image links untouched', () => {
    expect(resolveLinks('[docs](./docs/guide.md)', repo)).toBe('[docs](./docs/guide.md)')
  })
})

const okResponse = (body: string) => ({ ok: true, text: async () => body }) as Response

describe('fetchReadme', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retries after a failed fetch instead of caching the failure', async () => {
    const flaky = { full_name: 'octocat/flaky' } as Repo
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    expect(await fetchReadme(flaky)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fetchMock.mockResolvedValueOnce(okResponse('# Flaky\n'))
    expect(await fetchReadme(flaky)).toEqual({ markdown: '# Flaky\n', media: null })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('serves a second call for the same repo from cache', async () => {
    const cached = { full_name: 'octocat/cached' } as Repo
    fetchMock.mockResolvedValue(okResponse('![a](a.png)'))
    const first = await fetchReadme(cached)
    expect(await fetchReadme(cached)).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('caches a genuine "no README here" result', async () => {
    const bare = { full_name: 'octocat/bare' } as Repo
    fetchMock.mockResolvedValue({ ok: false } as Response)
    expect(await fetchReadme(bare)).toBeNull()
    const afterFirst = fetchMock.mock.calls.length // one miss per candidate filename
    expect(afterFirst).toBeGreaterThan(1)

    expect(await fetchReadme(bare)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(afterFirst)
  })
})
