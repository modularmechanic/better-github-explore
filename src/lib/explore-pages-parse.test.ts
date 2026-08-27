import { describe, expect, it } from 'vitest'
import { parseCollectionsPage, parseTopicsPage } from './explore-pages-parse'

/**
 * Trimmed copies of the real markup: the hero, the icon grid above the
 * featured list, two featured rows (the second deliberately imageless and
 * last, so a leak into the footer would show up), the popular sidebar, and a
 * footer image that must never be mistaken for a topic icon.
 */
const TOPICS_HTML = `
<div class="color-bg-subtle border-bottom">
  <div class="container-lg p-responsive text-center tmp-py-6">
    <h1 class="h1">Topics</h1>
    <p class="f4 color-fg-muted col-md-6 mx-auto">Browse popular topics on GitHub.</p>
  </div>
</div>
<ul class="d-flex flex-wrap">
  <li class="col-12">
    <div class="topic-box">
      <a href="/topics/scala" class="no-underline">
        <img src="https://explore-feed.github.com/topics/scala/scala.png" alt="scala">
        <p class="f3 lh-condensed text-center Link--primary mb-0 mt-1">Scala</p>
      </a>
    </div>
  </li>
</ul>
<h2 class="h2">All featured topics</h2>
<div>
  <div class="tmp-py-4 border-bottom d-flex flex-justify-between">
    <a href="/topics/awesome" class="no-underline flex-grow-0">
      <img
        src="https://explore-feed.github.com/topics/awesome/awesome.png"
        class="rounded tmp-mr-3"
        alt="awesome"
      >
    </a>
    <a href="/topics/awesome" class="no-underline flex-1 d-flex flex-column">
      <p class="f3 lh-condensed mb-0 mt-1 Link--primary">Awesome Lists</p>
      <p class="f5 color-fg-muted mb-0 mt-1">
        An awesome list is a list of awesome things curated by the community.
      </p>
    </a>
    <div class="flex-grow-0"><a href="/login?return_to=%2Ftopic.awesome">Star</a></div>
  </div>
  <div class="tmp-py-4 border-bottom d-flex flex-justify-between">
    <a href="/topics/chrome" class="no-underline flex-1 d-flex flex-column">
      <p class="f3 lh-condensed mb-0 mt-1 Link--primary">Chrome &amp; friends</p>
      <p class="f5 color-fg-muted mb-0 mt-1">Google&#39;s browser.</p>
    </a>
    <div class="flex-grow-0"><a href="/login?return_to=%2Ftopic.chrome">Star</a></div>
  </div>
</div>
<div class="col-lg-3">
  <h2 class="h4 mb-2">Popular topics</h2>
  <ul class="list-style-none">
    <li class="d-inline-block">
      <a data-ga-click="Topics, go to python, location:popular topics" href="/topics/python" title="Topic: python" class="topic-tag topic-tag-link f6 my-1">
  python
</a>
    </li>
    <li class="d-inline-block">
      <a data-ga-click="Topics, go to mcp, location:popular topics" href="/topics/mcp" title="Topic: mcp" class="topic-tag topic-tag-link f6 my-1">
  mcp
</a>
    </li>
  </ul>
</div>
<footer><img src="https://github.githubassets.com/footer.png" alt="footer"></footer>
`

const COLLECTIONS_HTML = `
<div class="color-bg-subtle border-bottom">
  <div class="container-lg p-responsive text-center tmp-py-6">
    <h1 class="h1">Collections</h1>
    <p class="f4 color-fg-muted col-md-8 mx-auto">Curated lists and insight into burgeoning industries, topics, and communities.</p>
  </div>
</div>
<div class="exploregrid">
  <a href="/collections/pixel-art-tools" class="exploregrid-item">
    <p class="f3">Pixel art tools</p>
  </a>
  <a href="/collections/learn-to-code" class="exploregrid-item">
    <p class="f3">Learn to Code</p>
  </a>
</div>
<h2 class="h3"><a href="/collections/clean-code-linters" data-ga-click="Explore, go to collection, text:Clean code linters">Clean code linters</a></h2>
<h2 class="h3"><a href="/collections/learn-to-code" data-ga-click="Explore, go to collection, text:Learn to Code">Learn to Code</a></h2>
<h2 class="h3"><a href="/collections/music" data-ga-click="Explore, go to collection, text:Music">Music</a></h2>
`

describe('parseTopicsPage', () => {
  const page = parseTopicsPage(TOPICS_HTML)

  it("captures GitHub's hero copy", () => {
    expect(page.hero).toEqual({ title: 'Topics', blurb: 'Browse popular topics on GitHub.' })
  })

  it('reads a featured entry with an image', () => {
    expect(page.featured[0]).toEqual({
      slug: 'awesome',
      name: 'Awesome Lists',
      description: 'An awesome list is a list of awesome things curated by the community.',
      image: 'https://explore-feed.github.com/topics/awesome/awesome.png',
    })
  })

  it('reads an imageless entry without borrowing the next image on the page', () => {
    expect(page.featured[1]).toEqual({
      slug: 'chrome',
      name: 'Chrome & friends',
      description: "Google's browser.",
      image: null,
    })
  })

  it('ignores the icon grid above the featured heading', () => {
    expect(page.featured.map((topic) => topic.slug)).toEqual(['awesome', 'chrome'])
  })

  it('lists popular topics in page order', () => {
    expect(page.popular).toEqual(['python', 'mcp'])
  })
})

describe('parseCollectionsPage', () => {
  const page = parseCollectionsPage(COLLECTIONS_HTML)

  it("captures GitHub's hero copy", () => {
    expect(page.hero).toEqual({
      title: 'Collections',
      blurb: 'Curated lists and insight into burgeoning industries, topics, and communities.',
    })
  })

  it('keeps page order and drops the repeat of a collection shown twice', () => {
    expect(page.order).toEqual(['pixel-art-tools', 'learn-to-code', 'clean-code-linters', 'music'])
  })
})

describe('empty input', () => {
  it('yields empty snapshots rather than throwing, so assertPlausible reports it', () => {
    expect(parseTopicsPage('')).toEqual({
      hero: { title: '', blurb: '' },
      featured: [],
      popular: [],
    })
    expect(parseCollectionsPage('')).toEqual({ hero: { title: '', blurb: '' }, order: [] })
  })
})
