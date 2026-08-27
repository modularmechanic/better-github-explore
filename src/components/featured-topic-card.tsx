import { Hash } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { navigate } from '@/hooks/use-hash-route'
import type { FeaturedTopic } from '@/types/explore-pages'

/**
 * Image-led card for one of the topics GitHub features at the top of /topics.
 *
 * Deliberately not TopicCard: a featured entry carries only the four fields the
 * page snapshot scrapes (slug, name, description, image), so there is no logo
 * path, release date or related-topics list to show and the artwork has to
 * carry the card. Several featured topics ship no image at all — GitHub draws a
 * "#" placeholder box for them — so the fallback below is a normal case, not an
 * error path.
 *
 * Laid out horizontally — artwork left, text right — because that is how the
 * real page renders these, and because a centred logo above the text made a
 * cramped, top-heavy card next to every other card in the app, all of which
 * lead with an avatar on the left.
 *
 * Clicking routes to the same detail view TopicCard opens, so the two are
 * interchangeable once the user is past the fold. The card is a div rather than
 * an anchor to match the rest of the app's cards, so it carries the link role
 * and an Enter handler to stay reachable from the keyboard.
 */
export function FeaturedTopicCard({ topic }: { topic: FeaturedTopic }) {
  const open = () => navigate('topics', topic.slug)

  return (
    <Card
      role="link"
      tabIndex={0}
      className="group flex cursor-pointer flex-row items-start gap-4 p-5 transition-colors hover:border-primary/40"
      onClick={open}
      onKeyDown={(event) => event.key === 'Enter' && open()}
    >
      {/*
        Wrapped, not bare. Card styles a direct <img> first child as a full-bleed
        cover: `has-[>img:first-child]:pt-0` strips the card's top padding and
        `*:[img:first-child]:rounded-t-xl` rounds it like a banner — which read as
        a logo jammed against the top edge with no spacing.
      */}
      <div className="shrink-0">
        {topic.image ? (
          <img
            src={topic.image}
            alt=""
            loading="lazy"
            className="size-14 rounded-xl bg-white/90 object-contain p-1.5"
          />
        ) : (
          <div className="grid size-14 place-items-center rounded-xl border text-muted-foreground">
            <Hash className="size-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-base leading-snug font-semibold tracking-tight group-hover:text-primary">
          {topic.name}
        </p>
        {topic.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-pretty text-muted-foreground">
            {topic.description}
          </p>
        )}
      </div>
    </Card>
  )
}
