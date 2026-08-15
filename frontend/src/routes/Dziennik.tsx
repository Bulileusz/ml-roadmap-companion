import { motion } from 'motion/react'
import { useMemo, useState, type CSSProperties } from 'react'

import { useDashboard, useJournalDays, usePhases, useSaveDayNote } from '@/api/queries'
import type { JournalDay, Phase } from '@/api/types'
import { Page } from '@/components/AppShell'
import { Chip, Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { buildFeed, calendarCells, parseDay } from '@/lib/journal'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import { DAYS, ENTRIES, REVIEWS, counted, plural } from '@/lib/plural'

/**
 * Dziennik nauki: kalendarz aktywności i chronologiczny zapis dni.
 *
 * Dzień jest tu wyliczony z `activity_log`, nie zapisany — jedyne, co dokładasz
 * ręcznie, to notatka. Stąd brak „minut nauki", choć makieta je przewidywała:
 * czasu sesji nigdzie nie mierzymy, a liczba wyliczona ze stawki na powtórkę
 * byłaby wymyślona, nie zmierzona. Reszta danych jest prawdziwa co do zdarzenia.
 *
 * Kwartał, nie rok: strumień dni stoi tu obok kalendarza, a nie zamiast niego,
 * i 91 pól mieści się w kolumnie treści bez zjeżdżania do 8 px na dzień.
 */
const WINDOW = 91

const DATE_LONG = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const DATE_SHORT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })
const WEEKDAY = new Intl.DateTimeFormat('pl-PL', { weekday: 'short' })

export function Dziennik() {
  const days = useJournalDays(WINDOW)
  const phases = usePhases()
  const dashboard = useDashboard()
  const saveNote = useSaveDayNote(WINDOW)

  const [filter, setFilter] = useState<'all' | 'noted'>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const all = days.data ?? []
  const active = all.filter((entry) => entry.events > 0)
  const noted = active.filter((entry) => entry.note !== '')

  const byId = useMemo(() => {
    const map = new Map<number, Phase>()
    for (const entry of phases.data ?? []) map.set(entry.phase.id, entry.phase)
    return map
  }, [phases.data])

  const phaseOf = (id: number | null) => (id === null ? undefined : byId.get(id))
  const colorOf = (id: number | null) => phaseVisual(phaseOf(id)?.code).color
  const nameOf = (id: number | null) => {
    const phase = phaseOf(id)
    return phase ? phaseTopic(phase.name) : 'poza fazami'
  }

  const reviewed = active.reduce((sum, entry) => sum + entry.reviewed, 0)
  const attempts = active.reduce((sum, entry) => sum + entry.attempts, 0)
  const independent = active.reduce((sum, entry) => sum + entry.independent, 0)
  const xp = active.reduce((sum, entry) => sum + entry.xp, 0)
  const streak = dashboard.data?.streak.current ?? 0

  const ordered = [...active].reverse()
  const shown = selected
    ? ordered.filter((entry) => entry.day === selected)
    : filter === 'noted'
      ? ordered.filter((entry) => entry.note !== '')
      : ordered
  const items = buildFeed(shown)

  function startEditing(entry: JournalDay) {
    setEditing(entry.day)
    setDraft(entry.note)
  }

  function commit(day: string, note: string) {
    saveNote.mutate({ day, note })
    setEditing(null)
    setDraft('')
  }

  if (days.isPending) {
    return (
      <Page>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-20" />
        <Skeleton className="mt-6 h-24" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <header className="flex items-baseline justify-between gap-6">
        <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
          Dziennik
        </h1>
        <span className="text-ink-faint tabular shrink-0 text-[0.72rem]">
          {all.length ? `od ${DATE_LONG.format(parseDay(all[0]!.day))}` : ''}
        </span>
      </header>

      <div className="border-line-strong border-line mt-5 grid grid-cols-2 border-y md:grid-cols-4">
        <Stat value={streak} label={plural(streak, DAYS) + ' serii'} accent />
        <Stat value={active.length} label={`dni z sesją na ${WINDOW}`} />
        <Stat
          value={reviewed}
          label={
            attempts === 0
              ? 'powtórek'
              : `powtórek, ${Math.round((independent / attempts) * 100)}% samodzielnie`
          }
        />
        <Stat value={xp} label="XP w tym oknie" accent />
      </div>

      <Calendar
        days={all}
        selected={selected}
        colorOf={colorOf}
        onSelect={(day) => {
          setSelected((current) => (current === day ? null : day))
          setFilter('all')
          setEditing(null)
        }}
      />

      <div className="border-line-strong mt-6 flex flex-wrap items-center gap-2.5 border-b pb-2.5">
        <Chip
          active={filter === 'all' && selected === null}
          onClick={() => {
            setFilter('all')
            setSelected(null)
          }}
        >
          Wszystkie dni
        </Chip>
        <Chip
          active={filter === 'noted'}
          onClick={() => {
            setFilter('noted')
            setSelected(null)
          }}
        >
          Z notatką
          <span className="text-ink-faint tabular">{noted.length}</span>
        </Chip>
        {selected ? (
          <span className="border-info/35 text-info flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-[0.72rem]">
            {DATE_SHORT.format(parseDay(selected))}
            <button
              onClick={() => setSelected(null)}
              aria-label="Pokaż z powrotem wszystkie dni"
              className="text-ink-faint hover:text-ink"
            >
              ×
            </button>
          </span>
        ) : null}
        <span className="flex-1" />
        <span className="text-ink-faint tabular shrink-0 text-[0.66rem]">
          {counted(shown.length, ENTRIES)}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-ink font-bold">
            {selected ? 'Ten dzień był wolny.' : 'Jeszcze nic tu nie ma.'}
          </p>
          <p className="text-ink-faint mt-2 text-xs">
            {selected
              ? 'Zdarza się. Seria i tak liczy się od dni, w których coś zrobiłeś.'
              : filter === 'noted'
                ? 'Żaden dzień nie ma jeszcze notatki.'
                : 'Pierwsza sesja nauki założy pierwszy wpis.'}
          </p>
          {selected || filter === 'noted' ? (
            <button
              onClick={() => {
                setSelected(null)
                setFilter('all')
              }}
              className="rounded-control border-line text-ink-muted hover:bg-raised mt-5 border px-3.5 py-2 text-[0.78rem] transition"
            >
              Pokaż wszystkie dni
            </button>
          ) : null}
        </div>
      ) : (
        items.map((item) =>
          item.kind === 'month' ? (
            <div key={item.key} className="flex items-baseline gap-3.5 pt-8 pb-3">
              <span className="font-display text-ink text-[0.82rem] font-bold tracking-wide">
                {item.label}
              </span>
              <span className="bg-line h-px flex-1" />
              <span className="text-ink-faint tabular shrink-0 text-[0.7rem]">
                {counted(item.days, DAYS)} · {item.xp} XP
              </span>
            </div>
          ) : item.kind === 'gap' ? (
            <div key={item.key} className="flex items-center py-0.5">
              <span className="w-[3.4rem] shrink-0" />
              <span className="flex w-6 shrink-0 justify-center">
                {/* Kreskowana szyna zamiast pustki: przerwa jest częścią osi,
                    a nie brakiem danych. */}
                <span
                  className="h-6 w-px"
                  style={{
                    background:
                      'repeating-linear-gradient(to bottom, var(--color-line) 0 3px, transparent 3px 6px)',
                  }}
                  aria-hidden
                />
              </span>
              <span className="text-ink-faint text-[0.72rem]">
                {counted(item.days, DAYS)} przerwy
              </span>
            </div>
          ) : (
            <DayRow
              key={item.key}
              entry={item.entry}
              colorOf={colorOf}
              nameOf={nameOf}
              editing={editing === item.entry.day}
              draft={draft}
              saving={saveNote.isPending}
              onDraft={setDraft}
              onEdit={() => startEditing(item.entry)}
              onCancel={() => setEditing(null)}
              onSave={() => commit(item.entry.day, draft.trim())}
              onDelete={() => commit(item.entry.day, '')}
            />
          ),
        )
      )}
    </Page>
  )
}

function Stat({
  value,
  label,
  accent = false,
}: {
  value: number
  label: string
  accent?: boolean
}) {
  return (
    <div className="border-line flex flex-col gap-1 py-3.5 pr-4 pl-4 first:pl-0 md:not-first:border-l">
      <span
        className={cn(
          'font-display tabular text-[1.35rem] leading-none font-extrabold tracking-tight',
          accent ? 'text-[var(--color-ember)]' : 'text-ink',
        )}
      >
        {value}
      </span>
      <span className="text-ink-faint text-[0.68rem]">{label}</span>
    </div>
  )
}

/**
 * Kalendarz aktywności: barwa niesie fazę, nasycenie objętość sesji.
 *
 * Dwie zmienne na jednym polu zamiast jednej — inaczej „ciemnozielony" znaczy
 * tylko „mało" i rok wygląda jak szum. Tutaj widać, że lipiec był fioletowy,
 * a sierpień pomarańczowy.
 */
function Calendar({
  days,
  selected,
  colorOf,
  onSelect,
}: {
  days: JournalDay[]
  selected: string | null
  colorOf: (id: number | null) => string
  onSelect: (day: string) => void
}) {
  const cells = calendarCells(days)
  const maxXp = Math.max(1, ...days.map((entry) => entry.xp))

  return (
    <div className="mt-6 flex flex-wrap items-end gap-4">
      <div
        className="grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 11px)' }}
      >
        {cells.map((entry, index) =>
          entry === null ? (
            <span key={`pad-${index}`} className="size-[11px]" aria-hidden />
          ) : entry.events === 0 ? (
            <span
              key={entry.day}
              title={`${DATE_SHORT.format(parseDay(entry.day))} — bez sesji`}
              className="bg-line size-[11px] rounded-[2px]"
            />
          ) : (
            <button
              key={entry.day}
              onClick={() => onSelect(entry.day)}
              title={`${DATE_SHORT.format(parseDay(entry.day))} — ${counted(
                entry.reviewed,
                REVIEWS,
              )}, +${entry.xp} XP`}
              className="size-[11px] rounded-[2px] transition-shadow"
              style={{
                // 22% to podłoga widoczności: dzień z jedną powtórką ma być
                // ciemny, ale nie nieodróżnialny od dnia bez sesji.
                background: `color-mix(in oklab, ${colorOf(
                  entry.phases[0]?.phase_id ?? null,
                )} ${22 + Math.round((entry.xp / maxXp) * 66)}%, var(--color-canvas))`,
                boxShadow:
                  selected === entry.day
                    ? '0 0 0 1.5px var(--color-canvas), 0 0 0 3px var(--color-info)'
                    : undefined,
              }}
            />
          ),
        )}
      </div>

      <div className="flex flex-col gap-1.5 pb-px">
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          Ostatnie 13 tygodni
        </span>
        <span className="text-ink-faint max-w-[15rem] text-[0.7rem] leading-relaxed">
          Barwa to faza, którą tego dnia powtarzałeś. Nasycenie to objętość sesji.
        </span>
      </div>
    </div>
  )
}

function detailLine(entry: JournalDay): string {
  const solo =
    entry.attempts === 0
      ? null
      : `${entry.attempts} ${plural(entry.attempts, {
          one: 'pytanie',
          few: 'pytania',
          many: 'pytań',
        })}, ${Math.round((entry.independent / entry.attempts) * 100)}% samodzielnie`

  return [
    entry.reviewed ? counted(entry.reviewed, REVIEWS) : null,
    entry.introduced
      ? `${entry.introduced} ${plural(entry.introduced, {
          one: 'nowa',
          few: 'nowe',
          many: 'nowych',
        })}`
      : null,
    solo,
    entry.tasks_done
      ? `${entry.tasks_done} ${plural(entry.tasks_done, {
          one: 'zadanie',
          few: 'zadania',
          many: 'zadań',
        })}`
      : null,
    entry.resources_done ? `${entry.resources_done} domknięte` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function DayRow({
  entry,
  colorOf,
  nameOf,
  editing,
  draft,
  saving,
  onDraft,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  entry: JournalDay
  colorOf: (id: number | null) => string
  nameOf: (id: number | null) => string
  editing: boolean
  draft: string
  saving: boolean
  onDraft: (value: string) => void
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const date = parseDay(entry.day)
  const lead = entry.phases[0]?.phase_id ?? null
  const dirty = draft.trim() !== entry.note

  return (
    <div
      className="flex items-start"
      style={{ '--phase': colorOf(lead) } as CSSProperties}
    >
      <div className="w-[3.4rem] shrink-0 pt-3 text-right">
        <div className="font-display text-ink tabular text-[1.15rem] leading-none font-extrabold tracking-tight">
          {date.getDate()}
        </div>
        <div className="text-ink-faint mt-1 text-[0.66rem]">{WEEKDAY.format(date)}</div>
      </div>

      <div className="flex w-6 shrink-0 flex-col items-center self-stretch">
        <span className="bg-line h-4 w-px" aria-hidden />
        <span className="size-[7px] rounded-full bg-[var(--phase)]" aria-hidden />
        <span className="bg-line w-px flex-1" aria-hidden />
      </div>

      <div className="min-w-0 flex-1 pt-2.5 pb-5">
        {/* Paski w barwach faz, szerokość proporcjonalna do udziału w dniu —
            jeden rzut oka mówi, czy dzień był o jednym temacie, czy o trzech. */}
        <div className="flex items-center gap-1">
          {entry.phases.map((slice) => (
            <span
              key={slice.phase_id ?? 'brak'}
              className="h-[3px] rounded-full"
              style={{
                background: colorOf(slice.phase_id),
                width: `${Math.max(6, Math.round((slice.count / entry.events) * 100))}%`,
              }}
              aria-hidden
            />
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-ink text-[0.88rem]">
            {entry.phases.map((slice) => nameOf(slice.phase_id)).join(' · ')}
          </span>
          <span className="text-ink-faint text-[0.78rem]">{detailLine(entry)}</span>
          <span className="flex-1" />
          <span className="font-display tabular shrink-0 text-[0.78rem] font-bold text-[var(--color-ember)]">
            +{entry.xp} XP
          </span>
        </div>

        {editing ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3"
          >
            <textarea
              value={draft}
              onChange={(event) => onDraft(event.currentTarget.value)}
              rows={3}
              autoFocus
              placeholder="Co dziś weszło, a co nie. Dla siebie, nie na ocenę."
              className="border-line bg-surface text-ink placeholder:text-ink-faint rounded-control w-full resize-y border px-3.5 py-3 text-[0.88rem] leading-relaxed transition-colors outline-none focus:border-[color-mix(in_oklab,var(--color-info)_55%,transparent)]"
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={onSave}
                disabled={!dirty || saving}
                className={cn(
                  'rounded-control font-display border px-3.5 py-2 text-[0.78rem] font-bold transition',
                  dirty
                    ? 'border-info/45 bg-info/14 text-ink hover:bg-info/22'
                    : 'border-line text-ink-faint',
                )}
              >
                {saving ? 'Zapisuję…' : 'Zapisz'}
              </button>
              <button
                onClick={onCancel}
                className="rounded-control border-line text-ink-muted hover:bg-raised border px-3.5 py-2 text-[0.78rem] transition"
              >
                Anuluj
              </button>
              {entry.note ? (
                <button
                  onClick={onDelete}
                  className="text-ink-faint hover:text-danger px-1 text-[0.78rem] transition-colors"
                >
                  Usuń notatkę
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : entry.note ? (
          <button
            onClick={onEdit}
            className="bg-surface text-ink-muted rounded-control hover:border-line mt-3 w-full cursor-text border border-transparent px-3.5 py-3 text-left text-[0.88rem] leading-relaxed whitespace-pre-line transition-colors"
          >
            {entry.note}
          </button>
        ) : (
          <button
            onClick={onEdit}
            className="text-ink-faint hover:text-ink-muted mt-2.5 text-[0.72rem] transition-colors"
          >
            Dopisz notatkę
          </button>
        )}
      </div>
    </div>
  )
}
