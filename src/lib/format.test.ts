import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  compactNumber, exploreAsset, headline, matches, starVelocity, stripHtml, timeAgo,
} from '@/lib/format'
import type { Repo } from '@/types/github'

const NOW = new Date('2026-06-15T12:00:00.000Z')
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Freezes the clock so every relative-time assertion is exact, not flaky. */
const freeze = () => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
}
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

afterEach(() => {
  vi.useRealTimers()
})

describe('compactNumber', () => {
  it('leaves anything under a thousand alone', () => {
    expect(compactNumber(0)).toBe('0')
    expect(compactNumber(7)).toBe('7')
    expect(compactNumber(999)).toBe('999')
  })

  it('treats a missing count as zero', () => {
    expect(compactNumber(undefined)).toBe('0')
    expect(compactNumber(null)).toBe('0')
  })

  it('drops a trailing .0', () => {
    expect(compactNumber(1_000)).toBe('1k')
    expect(compactNumber(1_500)).toBe('1.5k')
    expect(compactNumber(12_345)).toBe('12.3k')
    expect(compactNumber(1_000_000)).toBe('1M')
    expect(compactNumber(2_540_000)).toBe('2.5M')
  })

  it('keeps a value in its own unit while the mantissa still fits', () => {
    expect(compactNumber(960_000)).toBe('960k')
    expect(compactNumber(999_499)).toBe('999.5k')
  })

  it('promotes a value whose rounding overflows its unit', () => {
    // Regression: this used to render "1000k" / "1000M".
    expect(compactNumber(999_950)).toBe('1M')
    expect(compactNumber(999_999)).toBe('1M')
    expect(compactNumber(999_950_000)).toBe('1B')
  })

  it('keeps climbing past billions', () => {
    expect(compactNumber(1_000_000_000_000)).toBe('1T')
  })
})

describe('timeAgo', () => {
  it('calls anything under a minute "just now"', () => {
    freeze()
    expect(timeAgo(ago(30_000))).toBe('just now')
  })

  it('calls a future timestamp "just now" rather than a negative age', () => {
    freeze()
    expect(timeAgo(new Date(NOW.getTime() + HOUR).toISOString())).toBe('just now')
  })

  it('degrades an unparseable date to a vague phrase', () => {
    // Decision: "some time ago" reads correctly in every call site ("updated
    // some time ago"), where the old "NaNy ago" leaked a broken feed to the UI.
    freeze()
    expect(timeAgo('not-a-date')).toBe('some time ago')
    expect(timeAgo('')).toBe('some time ago')
  })

  it('rolls up to the next unit instead of printing its ceiling', () => {
    freeze()
    // Regression: 59m42s used to round to "60m ago" and 23h59m to "24h ago".
    expect(timeAgo(ago(59 * MINUTE + 42_000))).toBe('1h ago')
    expect(timeAgo(ago(23 * HOUR + 59 * MINUTE))).toBe('1d ago')
  })

  it('formats each unit', () => {
    freeze()
    expect(timeAgo(ago(5 * MINUTE))).toBe('5m ago')
    expect(timeAgo(ago(2 * HOUR))).toBe('2h ago')
    expect(timeAgo(ago(3 * DAY))).toBe('3d ago')
    expect(timeAgo(ago(31 * DAY))).toBe('1mo ago')
    expect(timeAgo(ago(45 * DAY))).toBe('2mo ago')
  })

  it('strips a trailing .0 from years but keeps a real fraction', () => {
    freeze()
    // 353 days is 11.6 months; rounding that to 12 used to promote it to a year.
    expect(timeAgo(ago(353 * DAY))).toBe('12mo ago')
    expect(timeAgo(ago(364 * DAY))).toBe('12mo ago')
    expect(timeAgo(ago(365 * DAY))).toBe('1y ago') // was "1.0y ago"
    expect(timeAgo(ago(547.5 * DAY))).toBe('1.5y ago')
  })
})

const repoAt = (created: string, stars: number) =>
  ({ created_at: created, stargazers_count: stars } as Repo)

describe('starVelocity', () => {
  it('clamps a brand-new repository to one day so velocity stays finite', () => {
    freeze()
    // Ten minutes old: without the clamp this would read ~72_000 stars/day.
    expect(starVelocity(repoAt(ago(10 * MINUTE), 500))).toBe(500)
  })

  it('averages stars over the repository lifetime', () => {
    freeze()
    expect(starVelocity(repoAt(ago(10 * DAY), 1_000))).toBe(100)
  })
})

describe('stripHtml', () => {
  it('removes tags and collapses the whitespace they leave behind', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
    expect(stripHtml('  <div>\n  spaced\n  </div>  ')).toBe('spaced')
  })

  it('handles a missing description', () => {
    expect(stripHtml(null)).toBe('')
    expect(stripHtml(undefined)).toBe('')
  })

  it('leaves HTML entities encoded', () => {
    // Pinned deliberately: the output goes into a React text node, which would
    // render "&nbsp;" literally. Decoding here would mean owning an entity table
    // for a feed that barely uses entities — not worth it until it shows up.
    expect(stripHtml('a&nbsp;b &amp; c')).toBe('a&nbsp;b &amp; c')
    // A real non-breaking space is whitespace, so it collapses like any other.
    expect(stripHtml('a\u00a0 b')).toBe('a b')
  })
})

describe('matches', () => {
  it('matches everything on an empty term', () => {
    expect(matches('', 'anything')).toBe(true)
    expect(matches('', null, undefined)).toBe(true)
  })

  it('ignores case on both sides', () => {
    expect(matches('REACT', 'facebook/react')).toBe(true)
    expect(matches('react', 'facebook/React')).toBe(true)
  })

  it('skips null and undefined fields instead of matching "null"', () => {
    expect(matches('null', null, undefined, 'clean')).toBe(false)
    expect(matches('clean', null, 'clean')).toBe(true)
  })

  it('searches across all fields', () => {
    expect(matches('router', 'remix/remix', 'a react router')).toBe(true)
    expect(matches('svelte', 'remix/remix', 'a react router')).toBe(false)
  })
})

describe('exploreAsset', () => {
  it('passes through an absolute URL', () => {
    const url = 'https://cdn.example.com/logo.png'
    expect(exploreAsset('topics', 'react', url)).toBe(url)
    expect(exploreAsset('topics', 'react', 'http://cdn.example.com/logo.png'))
      .toBe('http://cdn.example.com/logo.png')
  })

  it('resolves a bare filename against the github/explore repository', () => {
    // Regression: the guard was file.startsWith('http'), so this filename was
    // handed to <img src> as-is and 404ed.
    expect(exploreAsset('topics', 'x', 'httpclient.png'))
      .toBe('https://raw.githubusercontent.com/github/explore/main/topics/x/httpclient.png')
    expect(exploreAsset('collections', 'game-engines', 'logo.png'))
      .toBe('https://raw.githubusercontent.com/github/explore/main/collections/game-engines/logo.png')
  })
})

describe('headline', () => {
  it('humanises a repository name', () => {
    expect(headline('deepseek-harness')).toBe('Deepseek Harness')
    expect(headline('awesome_go')).toBe('Awesome Go')
    expect(headline('reactRouter')).toBe('React Router')
    expect(headline('TypeScript')).toBe('TypeScript')
    expect(headline('llm.c')).toBe('LLM C')
    expect(headline('vue3-ui-kit')).toBe('Vue3 UI Kit')
  })

  it('borrows the owner when the name is too short to say anything', () => {
    expect(headline('ui', 'shadcn-ui')).toBe('Shadcn UI')
    expect(headline('cli', 'vercel-labs')).toBe('Vercel CLI')
  })

  it('leaves a long enough name alone', () => {
    expect(headline('react', 'facebook')).toBe('React')
  })

  it('does not repeat the owner when it already matches the name', () => {
    expect(headline('ui', 'ui')).toBe('UI')
    expect(headline('cli', 'cli-org')).toBe('CLI')
  })
})
