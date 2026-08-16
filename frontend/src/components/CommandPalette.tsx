import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useFlashcards } from '@/api/queries'
import { Kbd } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { SPRING } from '@/lib/motion'
import { buildCommands, moveSelection, type Command } from '@/lib/palette'

/**
 * Paleta poleceń pod `mod+k`.
 *
 * Nie zastępuje skrótów — uczy ich: przy każdej pozycji stoi klawisz, który
 * robi to samo. Ma być drogą dla kogoś, kto jeszcze nie pamięta akordów,
 * i szukajką po fiszkach dla kogoś, kto pamięta.
 *
 * Ten sam `Dialog` z Radiksa co ściągawka, i to jest cała różnica dla
 * dostępności: pułapka focusu, `aria-modal`, Esc i przywrócenie focusu po
 * zamknięciu przychodzą z prymitywu, zamiast być odtwarzane ręcznie.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onShowHelp,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShowHelp: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="bg-surface border-line rounded-card shadow-lift fixed top-[12vh] left-1/2 z-50 flex w-[min(94vw,36rem)] -translate-x-1/2 flex-col overflow-hidden border"
                initial={{ opacity: 0, scale: 0.97, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={SPRING}
              >
                <Dialog.Title className="sr-only">Paleta poleceń</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Szukaj ekranu, akcji albo fiszki. Strzałki wybierają, Enter otwiera,
                  Esc zamyka.
                </Dialog.Description>
                {/* Zawartość montuje się dopiero z otwarciem, więc wpisane
                    zapytanie znika razem z paletą — bez efektu czyszczącego
                    stan, który i tak byłby tym samym, tylko okrężną drogą. */}
                <Body onClose={() => onOpenChange(false)} onShowHelp={onShowHelp} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function Body({
  onClose,
  onShowHelp,
}: {
  onClose: () => void
  onShowHelp: () => void
}) {
  const navigate = useNavigate()
  // Biblioteka fiszek jest jednym zapytaniem i zwykle siedzi już w cache'u,
  // więc paleta nie dokłada round-tripu na otwarcie.
  const cards = useFlashcards()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  const commands = useMemo(
    () => buildCommands(cards.data ?? [], query),
    [cards.data, query],
  )

  function run(command: Command | undefined) {
    if (!command) return
    onClose()
    if (command.act === 'help') onShowHelp()
    else if (command.to) void navigate(command.to)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((index) =>
        moveSelection(index, event.key === 'ArrowDown' ? 1 : -1, commands.length),
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      run(commands[selected])
    }
  }

  let lastGroup = ''

  return (
    <div onKeyDown={onKeyDown}>
      <div className="border-line flex items-center gap-3 border-b px-4 py-3">
        <span className="text-ink-faint font-mono text-xs" aria-hidden>
          ›
        </span>
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value)
            // Kursor wraca na początek razem z listą — inaczej zostawałby na
            // indeksie, pod którym po przefiltrowaniu jest już co innego.
            setSelected(0)
          }}
          placeholder="Dokąd iść, co zrobić, czego poszukać"
          aria-label="Szukaj polecenia albo fiszki"
          role="combobox"
          aria-expanded
          aria-controls="paleta-lista"
          aria-activedescendant={
            commands[selected] ? `paleta-${commands[selected].id}` : undefined
          }
          className="text-ink placeholder:text-ink-faint min-w-0 flex-1 bg-transparent text-[0.95rem] outline-none"
        />
        <Kbd>esc</Kbd>
      </div>

      <div
        id="paleta-lista"
        role="listbox"
        aria-label="Polecenia"
        className="max-h-[52vh] overflow-auto py-1.5"
      >
        {commands.length === 0 ? (
          <p className="text-ink-faint px-4 py-6 text-center text-xs">
            Nic nie pasuje. Spróbuj innego słowa — ogonki nie są wymagane.
          </p>
        ) : (
          commands.map((command, index) => {
            const header = command.group !== lastGroup ? command.group : null
            lastGroup = command.group
            return (
              <div key={command.id}>
                {header ? (
                  <div className="text-ink-faint px-4 pt-3 pb-1 text-[0.6rem] tracking-[0.18em] uppercase">
                    {header}
                  </div>
                ) : null}
                <button
                  id={`paleta-${command.id}`}
                  role="option"
                  aria-selected={index === selected}
                  onClick={() => run(command)}
                  onMouseMove={() => setSelected(index)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                    index === selected ? 'bg-raised' : 'hover:bg-raised/50',
                  )}
                >
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-[0.88rem]',
                      index === selected ? 'text-ink' : 'text-ink-muted',
                    )}
                  >
                    {command.label}
                  </span>
                  {command.hint ? (
                    <span className="text-ink-faint shrink-0 text-[0.7rem]">
                      {command.hint}
                    </span>
                  ) : null}
                  {command.chord ? (
                    <span className="flex shrink-0 gap-1">
                      {command.chord.split(' ').map((key, position) => (
                        <Kbd key={`${key}-${position}`}>{key}</Kbd>
                      ))}
                    </span>
                  ) : null}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
