import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { HotkeyCheatsheet } from '@/components/HotkeyCheatsheet'
import { Kbd } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { useHotkeys } from '@/lib/hotkeys-context'
import { pageTransition } from '@/lib/motion'
import { NAV } from '@/lib/nav'

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)

  useHotkeys([
    ...NAV.map((item) => ({
      keys: `g ${item.chord}`,
      description: item.label,
      group: 'Nawigacja',
      handler: () => void navigate(item.to),
    })),
    {
      keys: 's',
      description: 'Zacznij sesję dnia',
      group: 'Akcje',
      handler: () => void navigate('/session'),
    },
    {
      keys: '?',
      description: 'Ta ściągawka',
      group: 'Akcje',
      handler: () => setCheatsheetOpen((open) => !open),
    },
  ])

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[13rem_1fr]">
      <Sidebar />
      <main className="min-w-0 px-4 py-6 md:px-8 md:py-10">
        {/* mode="wait" zamiast równoległych wyjść: dwie strony jednocześnie
            w tym samym gridzie skakałyby wysokością przy każdej zmianie trasy. */}
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...pageTransition}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <HotkeyCheatsheet open={cheatsheetOpen} onOpenChange={setCheatsheetOpen} />
    </div>
  )
}

function Sidebar() {
  return (
    <nav
      className={cn(
        'bg-canvas/80 border-line sticky top-0 z-20 backdrop-blur',
        'flex gap-1 overflow-x-auto border-b px-3 py-2',
        'md:h-dvh md:flex-col md:gap-0.5 md:overflow-visible md:border-r md:border-b-0 md:px-3 md:py-6',
      )}
    >
      <div className="hidden px-2 pb-6 md:block">
        <p className="font-display text-ink text-sm font-extrabold tracking-tight">
          ML Roadmap
        </p>
        <p className="text-ink-faint text-xs">towarzysz codziennej nauki</p>
      </div>

      {NAV.map(({ to, label, icon: Icon, chord }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'rounded-control group flex shrink-0 items-center gap-2.5 px-3 py-2 text-sm transition',
              isActive
                ? 'bg-raised text-ink font-medium'
                : 'text-ink-muted hover:text-ink hover:bg-surface',
            )
          }
        >
          <Icon size={17} strokeWidth={2} />
          <span>{label}</span>
          {/* Podpowiedź skrótu tylko na szerokim ekranie i tylko przy hoverze:
              ma się przypomnieć, a nie zaśmiecać nawigację na stałe. */}
          <span className="ml-auto hidden opacity-0 transition-opacity group-hover:opacity-100 md:block">
            <Kbd>g {chord}</Kbd>
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
