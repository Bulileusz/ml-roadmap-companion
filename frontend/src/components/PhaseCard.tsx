import { Check, ChevronRight, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type CSSProperties } from 'react'

import type { PhaseProgress, Task } from '@/api/types'
import { useCreateTask, usePhaseTasks, useToggleTask } from '@/api/queries'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Badge, Card, EmptyState, Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { SPRING } from '@/lib/motion'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import { TASKS, counted } from '@/lib/plural'

/**
 * Faza roadmapy: barwa własna, pierścień postępu, rozwijana lista zadań.
 *
 * Zadania dociągamy dopiero po rozwinięciu (`enabled`), bo sześć faz razy
 * kilkanaście zadań to sześć zapytań na wejście na stronę startową po dane,
 * których nikt jeszcze nie oglądał.
 */
export function PhaseCard({
  entry,
  defaultOpen = false,
}: {
  entry: PhaseProgress
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const visual = phaseVisual(entry.phase.code)
  const complete = entry.total > 0 && entry.done === entry.total
  const tasks = usePhaseTasks(entry.phase.id, open)

  return (
    <motion.div layout style={{ '--phase': visual.color } as CSSProperties}>
      <Card className="phase-wash overflow-hidden">
        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="hover:bg-raised/40 flex w-full items-center gap-4 p-4 text-left transition"
        >
          {/* Lewa krawędź w barwie fazy - najtańszy sposób, żeby na liście
              sześciu kart było widać, gdzie się jest, bez czytania nazw. */}
          <span
            className="absolute top-0 bottom-0 left-0 w-[3px]"
            style={{ background: visual.color }}
            aria-hidden
          />
          <ProgressRing
            pct={entry.pct}
            size={52}
            thickness={5}
            label={`${entry.phase.name}: ${Math.round(entry.pct)}%`}
          >
            {complete ? (
              <Check size={18} style={{ color: visual.color }} strokeWidth={3} />
            ) : (
              <span className="font-display tabular text-ink text-xs font-bold">
                {Math.round(entry.pct)}
              </span>
            )}
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge>Faza {entry.phase.code}</Badge>
              {complete ? (
                <span className="text-success text-[0.7rem] font-medium">
                  domknięta
                </span>
              ) : null}
            </div>
            <p className="font-display text-ink mt-1 truncate font-bold">
              {phaseTopic(entry.phase.name)}
            </p>
            <p className="text-ink-faint mt-0.5 text-xs">
              {entry.done} z {counted(entry.total, TASKS)}
            </p>
          </div>

          <ChevronRight
            size={18}
            className={cn(
              'text-ink-faint shrink-0 transition-transform',
              open && 'rotate-90',
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="tasks"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-line space-y-0.5 border-t px-3 py-2">
                {tasks.isPending ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : tasks.data?.length ? (
                  tasks.data.map((task) => (
                    <TaskRow key={task.id} task={task} phaseId={entry.phase.id} />
                  ))
                ) : (
                  <EmptyState
                    title="Ta faza nie ma jeszcze zadań"
                    hint="Rozpisz ją na konkretne kroki — pierwszy poniżej."
                  />
                )}
                <AddTask phaseId={entry.phase.id} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

function TaskRow({ task, phaseId }: { task: Task; phaseId: number }) {
  const toggle = useToggleTask(phaseId)

  return (
    <label
      className={cn(
        'hover:bg-raised/60 group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition',
      )}
    >
      <input
        type="checkbox"
        checked={task.is_done}
        onChange={(event) =>
          toggle.mutate({ id: task.id, isDone: event.currentTarget.checked })
        }
        className="sr-only"
      />
      {/* Własny checkbox, nie systemowy: systemowy na ciemnym tle jest biały
          i nie da się go pomalować barwą fazy bez appearance:none, a wtedy i tak
          trzeba narysować znacznik. */}
      <span
        aria-hidden
        className={cn(
          'grid size-[18px] shrink-0 place-items-center rounded-md border transition',
          task.is_done
            ? 'border-transparent'
            : 'border-line-strong group-hover:border-[var(--phase)]',
        )}
        style={task.is_done ? { background: 'var(--phase)' } : undefined}
      >
        <AnimatePresence>
          {task.is_done ? (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={SPRING}
            >
              <Check size={12} strokeWidth={3.5} className="text-canvas" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>

      <span
        className={cn(
          'min-w-0 flex-1 text-sm transition-colors',
          task.is_done ? 'text-ink-faint line-through' : 'text-ink',
        )}
      >
        {task.title}
      </span>
    </label>
  )
}

function AddTask({ phaseId }: { phaseId: number }) {
  const [title, setTitle] = useState('')
  const create = useCreateTask(phaseId)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    // Pole czyścimy od razu, nie w onSuccess: zapis idzie do lokalnego SQLite'a,
    // a czekanie z wyczyszczeniem inputa sprawia, że szybkie dopisywanie kilku
    // zadań pod rząd zaczyna się zacinać.
    setTitle('')
    create.mutate(trimmed)
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-2 py-1.5">
      <Plus size={15} className="text-ink-faint shrink-0" />
      <input
        value={title}
        onChange={(event) => setTitle(event.currentTarget.value)}
        placeholder="dopisz zadanie…"
        className="placeholder:text-ink-faint text-ink min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
      />
    </form>
  )
}
