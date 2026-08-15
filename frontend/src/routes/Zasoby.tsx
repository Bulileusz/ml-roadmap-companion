import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type CSSProperties } from 'react'

import {
  useDeleteResource,
  usePhases,
  useResources,
  useUpdateResource,
} from '@/api/queries'
import type { PhaseProgress, Resource } from '@/api/types'
import { Page } from '@/components/AppShell'
import { Badge, Chip, Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import {
  STATUSES,
  STATUS_LABEL,
  STATUS_MARK,
  hostOf,
  kindLabel,
  nextStatus,
  type Status,
} from '@/lib/resources'
import { matches } from '@/lib/search'

/**
 * Materiały do przerobienia w danej fazie: książki, kursy, dokumentacja.
 *
 * Jedna faza naraz — tak samo jak w banku pytań i z tego samego powodu
 * (`/api/resources?phase_id=`). Materiał bez fazy nie mówi, kiedy go czytać,
 * a kolejność w fazie jest tu istotna, więc lista zostaje nieposortowana
 * przez UI: idzie tak, jak ustawia ją `order_index` z content/.
 *
 * Nowych materiałów się tu nie dodaje — wchodzą z `content/` (patrz README).
 * Zmienia się natomiast ich stan, i to jest sedno tego ekranu.
 */

export function Zasoby() {
  const phases = usePhases()
  const [chosen, setChosen] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)

  const entries = phases.data ?? []
  const fallback = entries.find((entry) => entry.done < entry.total) ?? entries[0]
  const phaseId = chosen ?? fallback?.phase.id ?? 0
  const entry = entries.find((item) => item.phase.id === phaseId)
  const visual = phaseVisual(entry?.phase.code)

  const resources = useResources(phaseId, phaseId !== 0)
  const all = resources.data ?? []
  const done = all.filter((item) => item.status === 'done').length

  const visible = useMemo(
    () =>
      all.filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false
        return (
          query.trim() === '' ||
          matches(item.title, query) ||
          matches(item.detail, query)
        )
      }),
    [all, statusFilter, query],
  )

  return (
    <Page>
      <div style={{ '--phase': visual.color } as CSSProperties}>
        <header className="flex items-baseline justify-between gap-6">
          <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
            Zasoby
          </h1>
          <span className="text-ink-faint tabular shrink-0 text-[0.72rem]">
            {resources.isPending || all.length === 0
              ? ''
              : `przerobione ${done} z ${all.length}`}
          </span>
        </header>

        <div className="border-line-strong mt-4 flex items-center gap-3 border-b pb-2.5">
          <span className="text-ink-faint font-mono text-xs">/</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value)
              setOpenId(null)
            }}
            placeholder="Szukaj w tytułach i opisach"
            className="text-ink placeholder:text-ink-faint min-w-0 flex-1 bg-transparent py-1 text-[0.95rem] outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-ink-faint hover:text-ink text-[0.72rem] transition-colors"
            >
              wyczyść
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {entries.map((item) => (
            <Chip
              key={item.phase.id}
              active={item.phase.id === phaseId}
              color={phaseVisual(item.phase.code).color}
              onClick={() => {
                setChosen(item.phase.id)
                setOpenId(null)
              }}
            >
              {phaseTopic(item.phase.name)}
            </Chip>
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-ink-faint mr-1 text-[0.62rem] tracking-[0.18em] uppercase">
            Stan
          </span>
          <Chip
            active={statusFilter === 'all'}
            pill={false}
            onClick={() => setStatusFilter('all')}
          >
            wszystkie
            <span className="text-ink-faint tabular">{all.length}</span>
          </Chip>
          {STATUSES.map((status) => (
            <Chip
              key={status}
              active={statusFilter === status}
              pill={false}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_LABEL[status]}
              <span className="text-ink-faint tabular">
                {all.filter((item) => item.status === status).length}
              </span>
            </Chip>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3 pb-1">
          <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
            {visible.length === all.length
              ? 'Wszystkie materiały'
              : `${visible.length} z ${all.length}`}
          </span>
          <span className="bg-line h-px flex-1" />
          <span className="text-ink-faint shrink-0 text-[0.66rem]">źródło</span>
        </div>

        {resources.isPending ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-display text-ink font-bold">
              {all.length === 0
                ? 'Ta faza nie ma jeszcze materiałów.'
                : 'Nic nie pasuje do tych filtrów.'}
            </p>
            <p className="text-ink-faint mt-2 text-xs">
              {all.length === 0
                ? 'Materiały wchodzą z katalogu content/ — dopisz je tam i doczytaj na stronie Dane.'
                : 'Zdejmij filtr stanu albo wyczyść szukajkę.'}
            </p>
          </div>
        ) : (
          visible.map((resource) => (
            <Row
              key={resource.id}
              resource={resource}
              phases={entries}
              phaseId={phaseId}
              open={openId === resource.id}
              onToggle={() =>
                setOpenId((id) => (id === resource.id ? null : resource.id))
              }
            />
          ))
        )}
      </div>
    </Page>
  )
}

function Row({
  resource,
  phases,
  phaseId,
  open,
  onToggle,
}: {
  resource: Resource
  phases: PhaseProgress[]
  phaseId: number
  open: boolean
  onToggle: () => void
}) {
  const entry = phases.find((item) => item.phase.id === resource.phase_id)
  const visual = phaseVisual(entry?.phase.code)
  const update = useUpdateResource(phaseId)
  const done = resource.status === 'done'

  return (
    <div
      className="border-line flex items-stretch border-b"
      style={{ '--phase': visual.color } as CSSProperties}
    >
      <span className="w-[3px] shrink-0 bg-[var(--phase)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="hover:bg-raised flex w-full items-center gap-3 pl-3 transition">
          <button
            onClick={() =>
              update.mutate({ id: resource.id, status: nextStatus(resource.status) })
            }
            title={`${STATUS_LABEL[resource.status]} — kliknij, żeby przestawić`}
            aria-label={`Stan: ${STATUS_LABEL[resource.status]}`}
            className={cn(
              'w-4 shrink-0 py-2.5 text-center font-mono text-xs transition-colors',
              done
                ? 'text-success'
                : resource.status === 'in_progress'
                  ? 'text-[var(--phase)]'
                  : 'text-ink-faint hover:text-ink',
            )}
          >
            {STATUS_MARK[resource.status]}
          </button>

          <button
            onClick={onToggle}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-4 py-2.5 text-left"
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-[0.88rem]',
                done ? 'text-ink-muted' : 'text-ink',
              )}
            >
              {resource.title}
            </span>
            <Badge>{kindLabel(resource.kind)}</Badge>
          </button>

          {resource.url ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="text-ink-faint hover:text-info w-32 shrink-0 truncate pr-1 text-right text-[0.72rem] transition-colors"
            >
              {hostOf(resource.url)} ↗
            </a>
          ) : (
            <span className="text-ink-faint w-32 shrink-0 pr-1 text-right text-[0.72rem]">
              —
            </span>
          )}
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <Editor
              resource={resource}
              phases={phases}
              phaseId={phaseId}
              onClose={onToggle}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Editor({
  resource,
  phases,
  phaseId,
  onClose,
}: {
  resource: Resource
  phases: PhaseProgress[]
  phaseId: number
  onClose: () => void
}) {
  const [title, setTitle] = useState(resource.title)
  const [url, setUrl] = useState(resource.url)
  const [detail, setDetail] = useState(resource.detail)
  const [target, setTarget] = useState<number | null>(resource.phase_id)
  const [confirming, setConfirming] = useState(false)
  const update = useUpdateResource(phaseId)
  const remove = useDeleteResource(phaseId)

  const dirty =
    title !== resource.title ||
    url !== resource.url ||
    detail !== resource.detail ||
    target !== resource.phase_id

  function save() {
    if (!dirty) return
    update.mutate(
      { id: resource.id, title, url, detail, phase_id: target },
      { onSuccess: onClose },
    )
  }

  const field =
    'border-line text-ink rounded-control w-full border bg-transparent px-3.5 py-2.5 text-[0.88rem] leading-relaxed outline-none transition-colors focus:border-[color-mix(in_oklab,var(--phase)_55%,transparent)]'

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="py-3 pr-1 pl-3.5">
        <div className="grid gap-3.5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Tytuł
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Link
            </span>
            <input
              value={url}
              onChange={(event) => setUrl(event.currentTarget.value)}
              placeholder="Opcjonalny"
              className={cn(field, 'placeholder:text-ink-faint')}
            />
          </label>
        </div>

        <label className="mt-3.5 flex flex-col gap-1.5">
          <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
            Opis
          </span>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.currentTarget.value)}
            rows={2}
            placeholder="Po co to i którą część przerabiasz."
            className={cn(field, 'placeholder:text-ink-faint resize-y')}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-ink-faint mr-1 text-[0.62rem] tracking-[0.18em] uppercase">
            Stan
          </span>
          {STATUSES.map((status) => (
            <Chip
              key={status}
              active={resource.status === status}
              pill={false}
              onClick={() => update.mutate({ id: resource.id, status })}
            >
              {STATUS_LABEL[status]}
            </Chip>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Faza
            </span>
            <select
              aria-label="Faza materiału"
              value={target ?? ''}
              onChange={(event) =>
                setTarget(
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
              className="border-line bg-surface text-ink rounded-control cursor-pointer border px-2.5 py-2 text-[0.8rem]"
            >
              <option value="">— brak fazy —</option>
              {phases.map((item) => (
                <option key={item.phase.id} value={item.phase.id}>
                  Faza {item.phase.code} · {phaseTopic(item.phase.name)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2.5">
            {confirming ? (
              <div className="rounded-control border-danger/40 bg-danger/8 flex items-center gap-3 border px-3 py-1.5">
                <span className="text-ink text-[0.78rem]">Usunąć ten materiał?</span>
                <button
                  onClick={() => remove.mutate(resource.id)}
                  className="font-display text-danger text-[0.78rem] font-bold hover:opacity-75"
                >
                  Usuń
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-ink-faint hover:text-ink text-[0.78rem]"
                >
                  Anuluj
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="rounded-control border-line text-ink-faint hover:text-danger hover:border-danger/45 border px-3.5 py-2 text-[0.78rem] transition"
              >
                Usuń
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-control border-line text-ink-muted hover:bg-raised border px-3.5 py-2 text-[0.78rem] transition"
            >
              Anuluj
            </button>
            <button
              onClick={save}
              disabled={!dirty || update.isPending}
              className={cn(
                'rounded-control font-display border px-4 py-2 text-[0.8rem] font-bold transition',
                dirty
                  ? 'border-info/45 bg-info/14 text-ink hover:bg-info/22'
                  : 'border-line text-ink-faint',
              )}
            >
              {update.isPending ? 'Zapisuję…' : dirty ? 'Zapisz zmiany' : 'Bez zmian'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
