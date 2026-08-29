import { Star } from 'lucide-react'

/** Where the source lives. Also the sitemap's and llms.txt's idea of "home". */
export const REPO_URL = 'https://github.com/modularmechanic/better-github-explore'

/**
 * A link to star the project, sat with the other header controls.
 *
 * The gold is a gradient, which means a paint server: `fill="gold"` on a lucide
 * icon can only take a flat colour, so the star points at a `<linearGradient>`
 * the header already renders for the Trending flame and this one adds beside it.
 *
 * The shine is a band of light swept across the button, clipped by the border's
 * own `overflow-hidden`, rather than anything applied to the glyph — a filter on
 * the SVG would light the strokes and leave the gradient looking washed out.
 * Timing, and why it idles between passes, is in the keyframes in index.css.
 */
export function StarThisRepo() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Star this repository on GitHub"
      aria-label="Star this repository on GitHub"
      className="group relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-amber-500/40 bg-amber-500/5 transition-colors hover:border-amber-400/70 hover:bg-amber-500/15 focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none sm:size-8"
    >
      <Star
        data-slot="star-icon"
        aria-hidden
        className="size-4 animate-star-twinkle group-hover:scale-110"
        fill="url(#star-gradient)"
        stroke="url(#star-gradient)"
      />
      {/*
        Wider than the button on both sides so the band is fully off the face at
        either end of its travel. It is skewed too, but that lives in the
        keyframes — see index.css. `pointer-events-none` keeps the link
        clickable underneath.
      */}
      <span
        data-slot="star-shine"
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -inset-x-2 animate-star-shine bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />
    </a>
  )
}
