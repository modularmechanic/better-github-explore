/**
 * READMEs are read from raw.githubusercontent.com, which costs nothing against
 * the API rate limit. Bodies are kept in memory rather than localStorage —
 * a few dozen READMEs would blow the 5 MB storage quota.
 */
import type { Repo } from '@/types/github'

const CANDIDATES = ['README.md', 'readme.md', 'README.markdown', 'README.rst', 'README.txt']

export interface ReadmeMedia {
  kind: 'image' | 'youtube'
  /** Image source, or the YouTube thumbnail. */
  src: string
  /** Where clicking should lead — the YouTube watch page, or the image itself. */
  href: string
}

export interface Readme {
  markdown: string
  media: ReadmeMedia | null
}

const cache = new Map<string, Promise<Readme | null>>()

/** Relative README links only resolve against the repository's raw root. */
const absolute = (url: string, repo: Repo) =>
  /^(https?:)?\/\//.test(url)
    ? url.replace(/^\/\//, 'https://')
    : `https://raw.githubusercontent.com/${repo.full_name}/HEAD/${url.replace(/^\.?\//, '')}`

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/

/** First inline image, or the first YouTube link if a video comes first. */
export function extractMedia(markdown: string, repo: Repo): ReadmeMedia | null {
  const image = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)|<img[^>]+src=["']([^"']+)["']/i.exec(markdown)
  const video = YOUTUBE_ID.exec(markdown)

  // Whichever appears first in the document wins.
  if (video && (!image || video.index < image.index)) {
    return {
      kind: 'youtube',
      src: `https://img.youtube.com/vi/${video[1]}/hqdefault.jpg`,
      href: `https://www.youtube.com/watch?v=${video[1]}`,
    }
  }
  if (image) {
    const url = absolute(image[1] ?? image[2], repo)
    // Badges (shields.io and friends) are decoration, not content.
    if (/(badge|shields\.io|badgen|travis-ci|circleci|codecov|\.svg($|\?))/i.test(url)) {
      const rest = markdown.slice(image.index + image[0].length)
      return rest ? extractMedia(rest, repo) : null
    }
    return { kind: 'image', src: url, href: url }
  }
  return null
}

async function load(repo: Repo): Promise<Readme | null> {
  for (const name of CANDIDATES) {
    const res = await fetch(`https://raw.githubusercontent.com/${repo.full_name}/HEAD/${name}`)
    if (!res.ok) continue
    const markdown = await res.text()
    return { markdown, media: extractMedia(markdown, repo) }
  }
  return null
}

export function fetchReadme(repo: Repo): Promise<Readme | null> {
  const existing = cache.get(repo.full_name)
  if (existing) return existing
  // Evict on failure: a cached rejection would hide the README for the rest of
  // the session, so one flaky request is not allowed to stick. A repo that
  // simply has no README resolves to null and stays cached.
  const pending = load(repo).catch(() => {
    cache.delete(repo.full_name)
    return null
  })
  cache.set(repo.full_name, pending)
  return pending
}

/** Rewrites relative image and link targets so rendered README HTML resolves. */
export function resolveLinks(markdown: string, repo: Repo): string {
  return markdown
    .replace(/(!\[[^\]]*\]\()\s*<?([^)\s>]+)>?/g, (_, prefix, url) => prefix + absolute(url, repo))
    .replace(/(<img[^>]+src=["'])([^"']+)/gi, (_, prefix, url) => prefix + absolute(url, repo))
}
