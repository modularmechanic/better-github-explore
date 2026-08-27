import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navigate, type Tab } from '@/hooks/use-hash-route'

/**
 * Masthead for a section of the Explore front page.
 *
 * `blurb` is text, not a `ReactNode`: it renders inside a `<p>`, and a caller
 * passing a block element there would produce invalid HTML that the browser
 * silently repairs by splitting the paragraph. Every call site passes a string,
 * so the narrower type costs nothing and makes the constraint checkable.
 */
export function SectionHeader({
  title, blurb, seeAll,
}: { title: string; blurb?: string; seeAll?: { tab: Tab; label: string } }) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-1 border-b pb-2">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {blurb && <p className="text-sm text-on-glow">{blurb}</p>}
      </div>
      {seeAll && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 text-xs text-muted-foreground"
          onClick={() => navigate(seeAll.tab)}
        >
          {seeAll.label} <ArrowRight />
        </Button>
      )}
    </div>
  )
}
