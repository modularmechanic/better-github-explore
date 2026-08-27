import { describe, expect, it } from 'vitest'
import { parseFunding } from './funding-yml'

describe('parseFunding', () => {
  it("finds nothing in GitHub's commented template", () => {
    const template = `# These are supported funding model platforms

github: # Replace with up to 4 GitHub Sponsors-enabled usernames e.g., [user1, user2]
patreon: # Replace with a single Patreon username
open_collective: # Replace with a single Open Collective username
tidelift: # Replace with a single Tidelift platform-name/package-name e.g., npm/babel
custom: # Replace with up to 4 custom sponsorship URLs e.g., ['link1', 'link2']
`
    expect(parseFunding(template)).toEqual({ githubLogins: [], external: [] })
  })

  it('reads list form, single values and a custom URL', () => {
    const parsed = parseFunding(`github: [axios, octocat]
open_collective: axios
custom: https://example.com/donate#now
`)
    expect(parsed.githubLogins).toEqual(['axios', 'octocat'])
    expect(parsed.external).toEqual([
      { platform: 'open_collective', url: 'https://opencollective.com/axios' },
      { platform: 'custom', url: 'https://example.com/donate#now' },
    ])
  })

  it('strips inline comments, collapses duplicates and drops junk handles', () => {
    const parsed = parseFunding(`github: vitejs  # our org
github: vitejs
tidelift: npm/vite
custom: not-a-url
`)
    expect(parsed.githubLogins).toEqual(['vitejs'])
    expect(parsed.external).toEqual([
      { platform: 'tidelift', url: 'https://tidelift.com/funding/github/npm/vite' },
    ])
  })

  it('strips a trailing comment but keeps a URL fragment', () => {
    const parsed = parseFunding('custom: https://x.com/#donate # the good one\n')
    expect(parsed.external).toEqual([{ platform: 'custom', url: 'https://x.com/#donate' }])
  })

  it('collapses duplicate platform entries', () => {
    const parsed = parseFunding(`patreon: someone
patreon: someone
custom: [https://a.example, 'https://a.example']
`)
    expect(parsed.external).toEqual([
      { platform: 'patreon', url: 'https://patreon.com/someone' },
      { platform: 'custom', url: 'https://a.example' },
    ])
  })

  it('rejects the template placeholder handles', () => {
    const parsed = parseFunding(`github: [user1, user2]
patreon: username
liberapay: your-username
ko_fi: e.g.
`)
    expect(parsed).toEqual({ githubLogins: [], external: [] })
  })

  it('rejects handles that are not valid GitHub logins', () => {
    const tooLong = 'a'.repeat(40)
    const parsed = parseFunding(`github: [ok-name, bad_login, -leading-dash, ${tooLong}]\n`)
    expect(parsed.githubLogins).toEqual(['ok-name'])
  })

  it('rejects a custom value that is not a URL', () => {
    expect(parseFunding('custom: paypal.me/someone\n').external).toEqual([])
  })

  it('ignores unknown keys and handles containing spaces', () => {
    const parsed = parseFunding(`unknown_platform: someone
patreon: some one
polar: polarsource
`)
    expect(parsed.external).toEqual([{ platform: 'polar', url: 'https://polar.sh/polarsource' }])
  })

  it('maps every supported platform to its funding URL', () => {
    const parsed = parseFunding(`ko_fi: kofiname
liberapay: liberapayname
issuehunt: issuehuntname
buy_me_a_coffee: bmacname
thanks_dev: thanksname
community_bridge: bridgename
`)
    expect(parsed.external.map((link) => link.url)).toEqual([
      'https://ko-fi.com/kofiname',
      'https://liberapay.com/liberapayname',
      'https://issuehunt.io/r/issuehuntname',
      'https://buymeacoffee.com/bmacname',
      'https://thanks.dev/thanksname',
      'https://funding.communitybridge.org/projects/bridgename',
    ])
  })
})
