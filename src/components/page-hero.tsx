import type { ReactNode } from 'react'
import type { PageHero as HeroCopy } from '@/types/explore-pages'

/**
 * The banner the Topics and Collections tabs open with, mirroring the centred
 * hero on github.com/topics and github.com/collections.
 *
 * Title and blurb come from the build-time page snapshot rather than strings
 * frozen in here, so the copy tracks whatever GitHub currently says. `children`
 * is the action slot: Collections hangs its contribute link there, Topics
 * passes nothing.
 *
 * The type stays responsive and the row wraps because this app shipped a real
 * horizontal-overflow bug — the hero is the widest thing on the page, and at
 * 360px a fixed text-3xl heading next to a button is the first thing to break.
 */
export function PageHero({ title, blurb, children }: HeroCopy & { children?: ReactNode }) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        <p className="max-w-[65ch] text-sm text-pretty text-on-glow sm:text-base">
          {blurb}
        </p>
      </div>
      {children}
    </section>
  )
}
