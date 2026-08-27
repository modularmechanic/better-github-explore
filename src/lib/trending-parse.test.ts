/**
 * Fixtures here are hand-trimmed from real /trending markup: same tags, same
 * classes, same entity escaping, with the octicon <path> data kept on the star
 * count so the "digits inside the svg" trap stays covered. Trimmed rather than
 * saved wholesale because the live page is ~600 kB — too big to commit, and it
 * would go stale the day GitHub reranks.
 */
import { describe, it, expect } from 'vitest'
import { parseTrendingRepos, parseTrendingDevelopers } from './trending-parse'

/** Builds a repo row; every part is overridable so a test can omit just one. */
function repoRow({
  full = 'tt-a1i/archify',
  description = '<p class="col-9 color-fg-muted my-1 tmp-pr-4">\n  A diagram skill &amp; more.\n</p>',
  language = '<span class="repo-language-color" style="background-color: #e34c26"></span>\n<span itemprop="programmingLanguage">HTML</span>',
  stars = '17,440',
  forks = '1,218',
  period = '1,002 stars today',
} = {}) {
  return `<article class="Box-row">
  <h2 class="h3 lh-condensed">
    <a href="/${full}" data-view-component="true" class="Link"><svg class="octicon"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0"></path></svg>
      <span class="text-normal">${full.split('/')[0]} /</span>
      ${full.split('/')[1]}</a>
  </h2>
  ${description}
  <div class="f6 color-fg-muted mt-2">
    <span class="tmp-mr-3 d-inline-block ml-0">${language}</span>
    <a href="/${full}/stargazers" class="Link--muted"><svg class="octicon"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612"></path></svg>
      ${stars}</a>
    <a href="/${full}/forks" class="Link--muted"><svg class="octicon"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5"></path></svg>
      ${forks}</a>
    <span class="tmp-mr-3 d-inline-block">
      Built by
      <a class="d-inline-block" href="/tt-a1i"><img class="avatar" src="https://avatars.githubusercontent.com/u/53142663?s=40&amp;v=4" width="20" alt="@tt-a1i" /></a>
      <a class="d-inline-block" href="/claude"><img class="avatar" src="https://avatars.githubusercontent.com/u/81847?s=40&amp;v=4" width="20" alt="@claude" /></a>
    </span>
    <span class="d-inline-block float-sm-right"><svg class="octicon"><path d="M8 .25a.75.75"></path></svg>
      ${period}
    </span>
  </div>
</article>`
}

describe('parseTrendingRepos', () => {
  it('reads every field off a complete row', () => {
    const [repo] = parseTrendingRepos(repoRow())

    expect(repo).toEqual({
      fullName: 'tt-a1i/archify',
      owner: 'tt-a1i',
      name: 'archify',
      description: 'A diagram skill & more.',
      language: 'HTML',
      languageColor: '#e34c26',
      stars: 17440,
      forks: 1218,
      starsInPeriod: 1002,
      builtBy: [
        'https://avatars.githubusercontent.com/u/53142663?s=40&v=4',
        'https://avatars.githubusercontent.com/u/81847?s=40&v=4',
      ],
    })
  })

  it('parses comma-separated counts as numbers, not strings', () => {
    const [repo] = parseTrendingRepos(repoRow({ stars: '1,002', forks: '12', period: '1 star today' }))

    expect(repo.stars).toBe(1002)
    expect(repo.forks).toBe(12)
    // Singular: GitHub drops the "s" at exactly one star in the window.
    expect(repo.starsInPeriod).toBe(1)
  })

  it('does not mistake the octicon path data for a star count', () => {
    // The <path d="M8 .25a.75..."> inside each anchor is full of digits; if the
    // tags were not stripped first, `stars` would be a nonsense number.
    expect(parseTrendingRepos(repoRow({ stars: '7' }))[0].stars).toBe(7)
  })

  it('yields a null description when the row carries none', () => {
    expect(parseTrendingRepos(repoRow({ description: '' }))[0].description).toBeNull()
  })

  it('yields nulls for both language fields when GitHub detected no language', () => {
    const [repo] = parseTrendingRepos(repoRow({ language: '' }))

    expect(repo.language).toBeNull()
    expect(repo.languageColor).toBeNull()
    // The rest of the row must survive the missing swatch.
    expect(repo.stars).toBe(17440)
  })

  it('keeps GitHub’s ranking order across rows', () => {
    const repos = parseTrendingRepos(repoRow() + repoRow({ full: 'basecamp/omarchy' }))

    expect(repos.map((r) => r.fullName)).toEqual(['tt-a1i/archify', 'basecamp/omarchy'])
  })

  it('returns [] for a page with no rows', () => {
    expect(parseTrendingRepos('<div class="Box"><p>No repositories found.</p></div>')).toEqual([])
  })
})

/** Builds a developer row, including the extra class the real page carries. */
function devRow({
  login = '1weiho',
  name = 'Yiwei Ho',
  popular = `<article>
  <div class="f6 color-fg-muted text-uppercase mb-1"><svg class="octicon"><path d="M9.533.753V.752"></path></svg>Popular repo</div>
  <h1 class="h4 lh-condensed">
    <a href="/1weiho/open-slide" class="css-truncate-target Link"><svg class="octicon"><path d="M2 2.5A2.5"></path></svg>
      open-slide</a>  </h1>
  <div class="f6 color-fg-muted mt-1">
    A slide framework built for agents.
  </div>
</article>`,
} = {}) {
  // The secondary <p> only renders when the account sets a display name.
  const secondary =
    name === login ? '' : `<p class="f4 text-normal mb-1"><a href="/${login}" class="Link--secondary Link">${login}</a></p>`

  return `<article class="Box-row d-lg-flex" id="pa-${login}">
  <div class="tmp-mx-3">
    <a href="/${login}" class="Link"><img class="rounded avatar-user" src="https://avatars.githubusercontent.com/u/75478661?s=96&amp;v=4" width="48" alt="@${login}" /></a>
  </div>
  <div class="col-md-6">
    <h1 class="h3 lh-condensed" >
      <a href="/${login}" class="Link">${name}</a>
    </h1>
    ${secondary}
  </div>
  <div class="col-md-6">${popular}</div>
</article>`
}

describe('parseTrendingDevelopers', () => {
  it('finds rows despite the extra class beside Box-row', () => {
    // A `class="Box-row"` exact match finds zero rows on this page — the whole
    // reason the shared splitter matches on the prefix only.
    expect(devRow()).toContain('class="Box-row d-lg-flex"')
    expect(parseTrendingDevelopers(devRow())).toHaveLength(1)
  })

  it('reads every field off a complete row', () => {
    const [dev] = parseTrendingDevelopers(devRow())

    expect(dev).toEqual({
      login: '1weiho',
      name: 'Yiwei Ho',
      avatar: 'https://avatars.githubusercontent.com/u/75478661?s=96&v=4',
      popularRepo: { name: 'open-slide', description: 'A slide framework built for agents.' },
    })
  })

  it('reports no name when the heading just repeats the login', () => {
    // GitHub falls back to the login when the account sets no display name.
    const [dev] = parseTrendingDevelopers(devRow({ login: 'nvk', name: 'nvk' }))

    expect(dev.login).toBe('nvk')
    expect(dev.name).toBeNull()
  })

  it('yields a null popularRepo when GitHub highlights none', () => {
    expect(parseTrendingDevelopers(devRow({ popular: '' }))[0].popularRepo).toBeNull()
  })

  it('yields a null popularRepo description when the repo has none', () => {
    const popular = `<article>
  <h1 class="h4 lh-condensed"><a href="/niels9001/quiet"><svg class="octicon"><path d="M2 2.5"></path></svg>quiet</a></h1>
</article>`

    expect(parseTrendingDevelopers(devRow({ popular }))[0].popularRepo).toEqual({
      name: 'quiet',
      description: null,
    })
  })

  it('returns [] for a page with no rows', () => {
    expect(parseTrendingDevelopers('<div class="Box"><p>No developers found.</p></div>')).toEqual([])
  })
})

it('deduplicates a contributor GitHub lists twice in Built by', () => {
  const row = `<article class="Box-row">
    <h2 class="h3 lh-condensed"><a href="/acme/widget">acme/widget</a></h2>
    <span>Built by
      <a><img src="https://avatars.githubusercontent.com/u/1?v=4"></a>
      <a><img src="https://avatars.githubusercontent.com/u/1?v=4"></a>
      <a><img src="https://avatars.githubusercontent.com/u/2?v=4"></a>
    </span>
  </article>`

  const [repo] = parseTrendingRepos(row)

  expect(repo.builtBy).toEqual([
    'https://avatars.githubusercontent.com/u/1?v=4',
    'https://avatars.githubusercontent.com/u/2?v=4',
  ])
})
