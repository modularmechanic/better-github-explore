// @vitest-environment jsdom
// DOMPurify binds to a window at import time, so this file cannot run in node.
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/markdown'

describe('renderMarkdown', () => {
  it('converts headings, lists and code', () => {
    const html = renderMarkdown('# Title\n\n- one\n- two\n\nRun `npm ci`.\n\n```js\nconst a = 1\n```\n')

    expect(html).toMatch(/<h1[^>]*>Title<\/h1>/)
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<li>two</li>')
    expect(html).toContain('<code>npm ci</code>')
    expect(html).toContain('<pre>')
  })

  it('keeps ordinary inline HTML that READMEs rely on', () => {
    const html = renderMarkdown('<p align="center"><b>Hello</b></p>')

    expect(html).toContain('<b>Hello</b>')
  })

  // This is the app's only dangerouslySetInnerHTML. A regression in any of the
  // four cases below is remote code execution from someone else's README.
  describe('sanitisation', () => {
    it('strips script tags and their contents', () => {
      const html = renderMarkdown('Hi\n\n<script>alert(1)</script>\n')

      expect(html).not.toContain('<script')
      expect(html).not.toContain('alert(1)')
      expect(html).toContain('Hi')
    })

    it('strips event handler attributes', () => {
      const html = renderMarkdown('<img src="x" onerror="alert(1)"><div onclick="alert(2)">hi</div>')

      expect(html).not.toContain('onerror')
      expect(html).not.toContain('onclick')
      expect(html).not.toContain('alert(')
      expect(html).toContain('<img')
    })

    it('neutralises javascript: hrefs', () => {
      const fromMarkdown = renderMarkdown('[click me](javascript:alert(1))')
      const fromHtml = renderMarkdown('<a href="javascript:alert(1)">click me</a>')

      expect(fromMarkdown).not.toContain('javascript:')
      expect(fromHtml).not.toContain('javascript:')
      expect(fromHtml).toContain('click me')
    })

    it('drops iframes', () => {
      expect(renderMarkdown('<iframe src="https://evil.test"></iframe>')).not.toContain('<iframe')
    })
  })

  it('sends links to a new tab without handing over the opener', () => {
    const html = renderMarkdown('[docs](https://example.com/docs)')

    expect(html).toContain('href="https://example.com/docs"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
