import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { HotkeyCheatsheet } from '@/components/HotkeyCheatsheet'
import { UnlockToast } from '@/components/UnlockToast'
import { Kbd } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { useHotkeys } from '@/lib/hotkeys-context'
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
      handler: () => void navigate('/sesja'),
    },
    {
      keys: '?',
      description: 'Ta ściągawka',
      group: 'Akcje',
      handler: () => setCheatsheetOpen((open) => !open),
    },
  ])

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Rail onHelp={() => setCheatsheetOpen(true)} />
      {/* Trasy same decydują o swoim układzie: strony treści biorą wąską
          kolumnę przez <Page>, a sesja wypełnia wysokość własnym flexem. */}
      <main className="flex min-w-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <HotkeyCheatsheet open={cheatsheetOpen} onOpenChange={setCheatsheetOpen} />
      {/* W powłoce, nie na ekranie sesji: domknięcie fazy przychodzi
          z odhaczenia zadania na Mapie, a nie z powtórki. */}
      <UnlockToast />
    </div>
  )
}

/**
 * Standardowa kolumna treści: 720 px na środku.
 *
 * Jedna wąska kolumna zamiast siatki paneli to główna decyzja tego motywu —
 * długość wiersza zostaje czytelna, a hierarchię niesie typografia i włosowe
 * kreski, nie ramki.
 */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-auto px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto w-full max-w-[45rem]">{children}</div>
    </div>
  )
}

function Rail({ onHelp }: { onHelp: () => void }) {
  return (
    <nav
      className={cn(
        'bg-canvas/90 border-line sticky top-0 z-20 flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 backdrop-blur',
        'md:h-dvh md:w-24 md:flex-col md:gap-0.5 md:overflow-visible md:border-r md:border-b-0 md:px-0 md:py-7',
      )}
    >
      <span className="font-display text-ink-faint hidden pb-6 pl-5 text-xs font-extrabold tracking-[0.12em] uppercase md:block">
        ML
      </span>

      {NAV.map(({ to, label, chord }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          title={`g ${chord}`}
          className={({ isActive }) =>
            cn(
              'shrink-0 border-l-2 px-3 py-2 text-xs tracking-[0.02em] transition-colors md:px-0 md:pr-2 md:pl-[18px] md:text-[0.78rem]',
              isActive
                ? 'text-ink border-[var(--phase,var(--color-info))]'
                : 'text-ink-faint hover:text-ink border-transparent',
            )
          }
        >
          {label}
        </NavLink>
      ))}

      {/* Klikalny, nie tylko podpowiedź: ściągawka ma być osiągalna także
          bez znajomości skrótu, którego uczy. */}
      <button
        onClick={onHelp}
        title="Skróty klawiszowe"
        className="ml-auto flex cursor-pointer items-center pr-1 md:mt-auto md:ml-0 md:pl-[18px]"
      >
        <Kbd>?</Kbd>
      </button>
    </nav>
  )
}
