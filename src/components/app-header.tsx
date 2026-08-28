import { useEffect, useState } from 'react'
import { Compass, Flame, KeyRound, Moon, Search, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BackToGitHub } from '@/components/back-to-github'
import { TokenDialog } from '@/components/token-dialog'
import { onRateLimit, rateLimit } from '@/lib/github-api'
import { navigate, visibleTabs, type Tab } from '@/hooks/use-hash-route'
import { useToken } from '@/hooks/use-token'
import { cn } from '@/lib/utils'

const LABELS: Record<Tab, string> = {
  explore: 'Explore',
  you: 'You',
  trending: 'Trending',
  discover: 'Discover',
  topics: 'Topics',
  collections: 'Collections',
  events: 'Events',
  sponsors: 'Sponsors',
}

function RateBadge() {
  const [rate, setRate] = useState(rateLimit)
  useEffect(() => onRateLimit(setRate), [])
  if (rate.remaining === null) return null

  const low = rate.remaining <= 5
  return (
    <span
      className={cn(
        'hidden rounded-full border px-2.5 py-1 font-mono text-xs text-muted-foreground sm:block',
        low && 'border-amber-500/50 text-amber-500',
      )}
      title={rate.reset ? `Resets at ${new Date(rate.reset).toLocaleTimeString()}` : undefined}
    >
      {rate.remaining}/{rate.limit} API
    </span>
  )
}

export function AppHeader({
  tab, search, onSearchChange,
}: { tab: Tab; search: string; onSearchChange: (value: string) => void }) {
  const { has } = useToken()
  const [tokenOpen, setTokenOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('bx-theme') !== 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('bx-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
      <div className="flex w-full flex-wrap items-center gap-4 px-3 py-2.5 sm:px-6">
        <BackToGitHub />

        <a href="#/explore" className="flex shrink-0 items-center gap-2 text-base tracking-tight">
          <Compass className="size-5 text-primary" />
          <span>
            Better GitHub{' '}
            <b className="bg-gradient-to-r from-link to-[#a371f7] bg-clip-text text-transparent">
              Explore
            </b>
          </span>
        </a>

        <div className="relative order-3 w-full sm:order-none sm:mx-auto sm:w-auto sm:flex-1 sm:max-w-md">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter what's on screen…"
            className="h-8 pl-8"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
          <RateBadge />
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setTokenOpen(true)} title="API token">
            <KeyRound />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setDark(!dark)} title="Toggle theme">
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </div>

      {/* The strip scrolls instead of stretching the page: on a 360px screen the
          six tabs are ~540px wide, which used to force the document wider than
          the viewport and pan every page sideways. */}
      <Tabs
        value={tab}
        onValueChange={(value) => navigate(value as Tab)}
        className="w-full min-w-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsList
          variant="line"
          className="h-auto w-max min-w-full justify-start rounded-none px-3 pb-1.5 sm:px-6"
        >
          {visibleTabs(has).map((name) => (
            <TabsTrigger key={name} value={name} className="flex-none px-3 text-sm">
              {LABELS[name]}
              {name === 'trending' && (
                // Gradient fill needs a real paint server, so the flame carries its own.
                <Flame className="size-4" fill="url(#flame-gradient)" stroke="url(#flame-gradient)" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <linearGradient id="flame-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e5484d" />
            <stop offset="55%" stopColor="#f76808" />
            <stop offset="100%" stopColor="#ffca16" />
          </linearGradient>
        </defs>
      </svg>

      <TokenDialog open={tokenOpen} onOpenChange={setTokenOpen} />
    </header>
  )
}
