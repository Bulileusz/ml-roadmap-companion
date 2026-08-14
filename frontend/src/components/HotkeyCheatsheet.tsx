import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'

import { Kbd } from '@/components/ui/primitives'
import { useHotkeyList } from '@/lib/hotkeys-context'
import { SPRING } from '@/lib/motion'

/**
 * Ściągawka skrótów pod `?`.
 *
 * Czyta ten sam rejestr, z którego działają skróty, więc nie może się z nim
 * rozjechać - dokumentacja skrótów wpisana ręcznie kłamie po pierwszej zmianie.
 * Grupy wychodzą z kolejności rejestracji, a nie z alfabetu: nawigacja jest
 * pierwsza, bo od niej się zaczyna.
 */
export function HotkeyCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const bindings = useHotkeyList()

  const groups = new Map<string, typeof bindings>()
  for (const binding of bindings) {
    const group = binding.group ?? 'Inne'
    groups.set(group, [...(groups.get(group) ?? []), binding])
  }

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
                className="bg-surface border-line rounded-card shadow-lift fixed top-1/2 left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 border p-6"
                initial={{ opacity: 0, scale: 0.96, y: '-48%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%' }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={SPRING}
              >
                <Dialog.Title className="font-display text-ink text-lg font-bold">
                  Skróty klawiszowe
                </Dialog.Title>
                <Dialog.Description className="text-ink-faint mt-1 text-xs">
                  Całą apkę da się obsłużyć bez myszy. Esc zamyka.
                </Dialog.Description>

                <div className="mt-5 space-y-5">
                  {[...groups].map(([group, items]) => (
                    <section key={group}>
                      <h3 className="text-ink-faint mb-2 text-[0.7rem] font-semibold tracking-wide uppercase">
                        {group}
                      </h3>
                      <ul className="space-y-1.5">
                        {items.map((binding) => (
                          <li
                            key={binding.keys}
                            className="flex items-center justify-between gap-4 text-sm"
                          >
                            <span className="text-ink-muted">
                              {binding.description}
                            </span>
                            <span className="flex shrink-0 gap-1">
                              {binding.keys.split(' ').map((key, index) => (
                                <Kbd key={`${key}-${index}`}>{key}</Kbd>
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
