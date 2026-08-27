import { useState } from 'react'
import { Play } from 'lucide-react'
import type { ReadmeMedia } from '@/lib/readme'

/**
 * First image or video found in a repository's README. Videos show YouTube's
 * thumbnail and open on YouTube — embedding a player in every card would pull
 * a tracking iframe into the grid.
 */
export function RepoMedia({ media, className = 'h-36' }: { media: ReadmeMedia; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <a
      href={media.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`group/media relative block w-full overflow-hidden rounded-lg border bg-muted ${className}`}
    >
      <img
        src={media.src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-full object-cover transition-transform duration-300 group-hover/media:scale-[1.03]"
      />
      {media.kind === 'youtube' && (
        <span className="absolute inset-0 grid place-items-center bg-black/30">
          <span className="grid size-10 place-items-center rounded-full bg-black/70 text-white">
            <Play className="size-4 fill-current" />
          </span>
        </span>
      )}
    </a>
  )
}
