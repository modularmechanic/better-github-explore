import { useState } from 'react'
import { Play } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReadmeMedia } from '@/lib/readme'

/**
 * First image or video found in a repository's README. Videos show YouTube's
 * thumbnail and open on YouTube — embedding a player in every card would pull
 * a tracking iframe into the grid.
 *
 * The component owns the whole slot, `loading` included, rather than being
 * mounted only once media is known. A card that mounts this conditionally grows
 * by the height of the image the moment its README resolves, shoving the
 * description and stats down; holding a skeleton of the same height from the
 * start means the picture swaps into space already reserved for it.
 *
 * Two things can end the wait. A README with no usable media collapses the slot
 * once, on settle. A README with media keeps the skeleton until the bitmap has
 * actually decoded — `loading` only covers fetching the markdown, and the image
 * request starts after that — then crossfades to the picture.
 */
export function RepoMedia({
  media,
  loading = false,
  className = 'h-36',
}: {
  media: ReadmeMedia | null
  loading?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (loading) return <Skeleton className={cn('w-full rounded-lg', className)} />
  if (!media || failed) return null

  return (
    <a
      href={media.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'group/media relative block w-full overflow-hidden rounded-lg border bg-muted',
        className,
      )}
    >
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <img
        src={media.src}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        // `transition` rather than `transition-transform`: it carries the hover
        // scale and the fade-in on decode, which share a duration here.
        className={cn(
          'size-full object-cover transition duration-300 group-hover/media:scale-[1.03]',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      {media.kind === 'youtube' && loaded && (
        <span className="absolute inset-0 grid place-items-center bg-black/30">
          <span className="grid size-10 place-items-center rounded-full bg-black/70 text-white">
            <Play className="size-4 fill-current" />
          </span>
        </span>
      )}
    </a>
  )
}
