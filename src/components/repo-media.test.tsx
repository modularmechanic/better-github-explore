// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { RepoMedia } from './repo-media'
import type { ReadmeMedia } from '@/lib/readme'

const image: ReadmeMedia = { kind: 'image', src: 'https://example.com/a.png', href: 'https://example.com/a.png' }
const video: ReadmeMedia = { kind: 'youtube', src: 'https://img.youtube.com/vi/x/hq.jpg', href: 'https://youtu.be/x' }

const skeletons = (root: HTMLElement) => root.querySelectorAll('[data-slot="skeleton"]').length

describe('RepoMedia', () => {
  // The point of the component: the slot is the same height before and after
  // the README resolves, so the card does not grow underneath the reader.
  it('holds a skeleton of the requested height while the README is loading', () => {
    const { container } = render(<RepoMedia media={null} loading className="h-32" />)
    expect(skeletons(container)).toBe(1)
    expect(container.querySelector('[data-slot="skeleton"]')?.className).toContain('h-32')
    expect(container.querySelector('img')).toBe(null)
  })

  it('collapses once a README settles with no usable media', () => {
    const { container } = render(<RepoMedia media={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('keeps the skeleton until the bitmap decodes, then shows the image', () => {
    const { container } = render(<RepoMedia media={image} />)
    const img = container.querySelector('img')!

    // Fetched but not yet painted: the picture is mounted so the browser starts
    // the request, held invisible so it cannot flash in half-drawn.
    expect(img.className).toContain('opacity-0')
    expect(skeletons(container)).toBe(1)

    fireEvent.load(img)
    expect(img.className).toContain('opacity-100')
    expect(skeletons(container)).toBe(0)
  })

  it('drops the slot entirely when the image 404s', () => {
    const { container } = render(<RepoMedia media={image} />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.innerHTML).toBe('')
  })

  // The badge is an overlay; drawing it over a skeleton would advertise a video
  // that is not on screen yet.
  it('holds the play badge back until the thumbnail is there to sit on', () => {
    const { container } = render(<RepoMedia media={video} />)
    expect(container.querySelector('svg')).toBe(null)

    fireEvent.load(container.querySelector('img')!)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
