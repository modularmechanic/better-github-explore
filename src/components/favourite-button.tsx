import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FavouriteButton({
  active, onToggle, label,
}: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-7 shrink-0"
      aria-pressed={active}
      title={active ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      onClick={(e) => {
        e.stopPropagation() // the whole card is a link target
        onToggle()
      }}
    >
      <Star className={cn('size-4', active ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
    </Button>
  )
}
