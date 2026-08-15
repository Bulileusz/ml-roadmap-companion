import { AnimatePresence, motion } from 'motion/react'
import { useState, type CSSProperties } from 'react'

import { usePhaseTasks, usePhases, useToggleTask } from '@/api/queries'
import type { PhaseProgress, Task } from '@/api/types'
import { Page } from '@/components/AppShell'
import { Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { phaseTopic, phaseVisual } from '@/lib/phases'

/**
 * Roadmapa jako oś czasu.
 *
 * Fazy są sekwencyjne — pionowa oś z kropkami to wyraża, siatka kart nie.
 * Kropka zapalona znaczy „ruszona", ciągła szyna między kropkami — „domknięta".
 */
export function Mapa() {
  const phases = usePhases()
  const currentId = phases.data?.find((entry) => entry.done < entry.total)?.phase.id

  const done = phases.data?.reduce((sum, entry) => sum + entry.done, 0) ?? 0
  const total = phases.data?.reduce((sum, entry) => sum + entry.total, 0) ?? 0

  return (
    <Page>
      <header className="flex items-baseline justify-between gap-6 pb-4">
        <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
          Roadmapa
        </h1>
        <span className="text-ink-faint tabular text-[0.78rem]">
          {total > 0
            ? `${done} z ${total} zadań · ${Math.round((done / total) * 100)}%`
            : ''}
        </span>
      </header>
      <div className="bg-line-strong mb-2 h-px" />

      {phases.isPending
        ? Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="mb-3 h-20" />
          ))
        : phases.data?.map((entry) => (
            <PhaseRow
              key={entry.phase.id}
              entry={entry}
              defaultOpen={entry.phase.id === currentId}
            />
          ))}
    </Page>
  )
}

function PhaseRow({
  entry,
  defaultOpen,
}: {
  entry: PhaseProgress
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const visual = phaseVisual(entry.phase.code)
  const complete = entry.total > 0 && entry.done === entry.total
  const started = entry.done > 0
  const tasks = usePhaseTasks(entry.phase.id, open)

  return (
    <div
      className="flex gap-5"
      style={
        {
          '--phase': visual.color,
          '--dot': started ? visual.color : 'var(--color-line-strong)',
          '--spine': complete ? visual.color : 'var(--color-line)',
          '--halo': open
            ? `color-mix(in oklab, ${visual.color} 26%, transparent)`
            : 'transparent',
        } as CSSProperties
      }
    >
      <div className="flex w-3 shrink-0 flex-col items-center">
        {/* Podwójny box-shadow: pierwszy wycina kropkę z szyny kolorem płótna,
            drugi rysuje halo wokół rozwiniętej fazy. */}
        <span
          className="mt-6 size-[11px] rounded-full bg-[var(--dot)]"
          style={{ boxShadow: '0 0 0 4px var(--color-canvas), 0 0 0 7px var(--halo)' }}
          aria-hidden
        />
        <span className="w-[3px] flex-1 bg-[var(--spine)]" aria-hidden />
      </div>

      <div className="min-w-0 flex-1 pt-4 pb-1.5">
        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-baseline gap-3 text-left"
        >
          <span
            className={cn(
              'font-display text-[1.05rem] font-extrabold tracking-tight',
              started ? 'text-ink' : 'text-ink-faint',
            )}
          >
            {phaseTopic(entry.phase.name)}
          </span>
          <span className="bg-line h-px flex-1" />
          <span className="text-ink-faint tabular shrink-0 text-[0.72rem]">
            {entry.done} / {entry.total}
          </span>
        </button>

        <div className="bg-line-strong relative mt-3 h-0.5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--phase)] transition-[width] duration-500"
            style={{ width: `${entry.pct}%` }}
          />
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-3 pb-4">
                {tasks.isPending ? (
                  <Skeleton className="h-8 w-2/3" />
                ) : tasks.data?.length ? (
                  tasks.data.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      phaseId={entry.phase.id}
                      next={
                        !task.is_done &&
                        tasks.data.findIndex((other) => !other.is_done) === index
                      }
                    />
                  ))
                ) : (
                  <p className="text-ink-faint py-2 text-xs">
                    Ta faza nie ma jeszcze rozpisanych zadań.
                  </p>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  phaseId,
  next,
}: {
  task: Task
  phaseId: number
  next: boolean
}) {
  const toggle = useToggleTask(phaseId)

  // Trzy znaki zamiast checkboxa: zrobione, następne w kolejce, reszta.
  // Na gęstej liście czyta się to szybciej niż kwadraciki, a wciąż da się kliknąć.
  const mark = task.is_done ? '✓' : next ? '▸' : '·'

  return (
    <button
      onClick={() => toggle.mutate({ id: task.id, isDone: !task.is_done })}
      className="border-line hover:bg-raised/40 flex w-full items-center gap-3 border-b px-1 py-2.5 text-left transition"
    >
      <span
        className={cn(
          'w-3.5 shrink-0 font-mono text-xs',
          task.is_done
            ? 'text-success'
            : next
              ? 'text-[var(--phase)]'
              : 'text-ink-faint',
        )}
        aria-hidden
      >
        {mark}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[0.85rem] transition-colors',
          task.is_done
            ? 'text-ink-muted line-through'
            : next
              ? 'text-ink'
              : 'text-ink-faint',
        )}
      >
        {task.title}
      </span>
    </button>
  )
}
