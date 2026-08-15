import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'

import {
  useDeleteFlashcard,
  useFlashcards,
  usePhases,
  useUpdateFlashcard,
} from '@/api/queries'
import type { Flashcard, PhaseProgress } from '@/api/types'
import { Page } from '@/components/AppShell'
import { Badge, Kbd, Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { useHotkeys } from '@/lib/hotkeys-context'
import { dueLabel, todayISO } from '@/lib/leitner'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import { CARDS, counted } from '@/lib/plural'
import { matches } from '@/lib/search'

/**
 * Biblioteka fiszek — 76 pozycji, więc gęstość jest tu decyzją projektową.
 *
 * Filtrowanie i szukanie idą po stronie klienta: cała kolekcja to kilkadziesiąt
 * wierszy, więc round-trip po każdym wciśniętym klawiszu byłby wolniejszy od
 * przefiltrowania tablicy i dokładałby stany ładowania tam, gdzie ich nie widać.
 *
 * Fiszek się tutaj nie dodaje — nowe wchodzą wyłącznie z `content/`, żeby treść
 * miała jedno źródło prawdy w gicie (patrz README).
 */
export function Fiszki() {
  const cards = useFlashcards()
  const phases = usePhases()
  const [query, setQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>('all')
  const [boxFilter, setBoxFilter] = useState<number | 'all' | 'intro'>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useHotkeys([
    {
      keys: '/',
      description: 'Szukaj w fiszkach',
      group: 'Fiszki',
      handler: () => searchRef.current?.focus(),
    },
    {
      keys: 'esc',
      description: 'Zamknij edytor / wyjdź z szukajki',
      group: 'Fiszki',
      allowWhileTyping: true,
      handler: () => {
        if (document.activeElement === searchRef.current) searchRef.current?.blur()
        else setOpenId(null)
      },
    },
  ])

  const all = cards.data ?? []
  const introCount = all.filter((card) => card.learned_at === null).length

  const visible = useMemo(
    () =>
      all.filter((card) => {
        if (phaseFilter !== 'all' && card.phase_id !== phaseFilter) return false
        if (boxFilter === 'intro' && card.learned_at !== null) return false
        if (typeof boxFilter === 'number' && card.box !== boxFilter) return false
        // Szukanie obejmuje też notatkę — „moimi słowami" to często jedyne
        // miejsce, gdzie zapisałeś skojarzenie, po którym potem szukasz.
        return (
          query.trim() === '' ||
          matches(card.front, query) ||
          matches(card.back, query) ||
          matches(card.own_note, query)
        )
      }),
    [all, phaseFilter, boxFilter, query],
  )

  return (
    <Page>
      <header className="flex items-baseline justify-between gap-6">
        <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
          Biblioteka fiszek
        </h1>
        <span className="text-ink-faint tabular shrink-0 text-[0.72rem]">
          {cards.isPending
            ? ''
            : `${counted(all.length, CARDS)} · ${introCount} do zapoznania · ${all.length - introCount} w rotacji`}
        </span>
      </header>

      <div className="border-line-strong mt-4 flex items-center gap-3 border-b pb-2.5">
        <span className="text-ink-faint font-mono text-xs">/</span>
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value)
            setOpenId(null)
          }}
          placeholder="Szukaj w przodzie, tyle i notatkach"
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

      <Filters
        phases={phases.data ?? []}
        cards={all}
        introCount={introCount}
        phaseFilter={phaseFilter}
        boxFilter={boxFilter}
        onPhase={(value) => {
          setPhaseFilter(value)
          setOpenId(null)
        }}
        onBox={(value) => {
          setBoxFilter(value)
          setOpenId(null)
        }}
      />

      <div className="mt-6 flex items-center gap-3 pb-1">
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          {visible.length === all.length
            ? 'Wszystkie fiszki'
            : `${visible.length} z ${all.length}`}
        </span>
        <span className="bg-line h-px flex-1" />
        <span className="text-ink-faint shrink-0 text-[0.66rem]">
          termin następnej powtórki
        </span>
      </div>

      {cards.isPending ? (
        <div className="space-y-2 py-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-14 text-center">
          <p className="font-display text-ink font-bold">
            Nic nie pasuje do tych filtrów.
          </p>
          <p className="text-ink-faint mt-2 text-xs">
            Zdejmij filtr fazy albo pudełka, żeby zobaczyć więcej.
          </p>
        </div>
      ) : (
        visible.map((card) => (
          <Row
            key={card.id}
            card={card}
            phases={phases.data ?? []}
            open={openId === card.id}
            onToggle={() => setOpenId((id) => (id === card.id ? null : card.id))}
          />
        ))
      )}
    </Page>
  )
}

function Chip({
  active,
  color,
  onClick,
  children,
  pill = true,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
  pill?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-2 border px-2.5 py-1.5 text-[0.72rem] transition',
        pill ? 'rounded-full' : 'rounded-control',
        active
          ? 'bg-raised text-ink border-line-strong'
          : 'border-line text-ink-muted hover:text-ink',
      )}
      style={active && color ? { borderColor: color } : undefined}
    >
      {color ? (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
}

function Filters({
  phases,
  cards,
  introCount,
  phaseFilter,
  boxFilter,
  onPhase,
  onBox,
}: {
  phases: PhaseProgress[]
  cards: Flashcard[]
  introCount: number
  phaseFilter: number | 'all'
  boxFilter: number | 'all' | 'intro'
  onPhase: (value: number | 'all') => void
  onBox: (value: number | 'all' | 'intro') => void
}) {
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip active={phaseFilter === 'all'} onClick={() => onPhase('all')}>
          Wszystkie
          <span className="text-ink-faint tabular">{cards.length}</span>
        </Chip>
        {phases.map((entry) => {
          const count = cards.filter((card) => card.phase_id === entry.phase.id).length
          return (
            <Chip
              key={entry.phase.id}
              active={phaseFilter === entry.phase.id}
              color={phaseVisual(entry.phase.code).color}
              onClick={() => onPhase(entry.phase.id)}
            >
              {phaseTopic(entry.phase.name)}
              <span className="text-ink-faint tabular">{count}</span>
            </Chip>
          )
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-ink-faint mr-1 text-[0.62rem] tracking-[0.18em] uppercase">
          Pudełko
        </span>
        <Chip active={boxFilter === 'all'} pill={false} onClick={() => onBox('all')}>
          wszystkie
          <span className="text-ink-faint tabular">
            {cards.filter((card) => card.learned_at !== null).length}
          </span>
        </Chip>
        {[1, 2, 3, 4, 5].map((box) => (
          <Chip
            key={box}
            active={boxFilter === box}
            pill={false}
            onClick={() => onBox(box)}
          >
            {box}
            <span className="text-ink-faint tabular">
              {
                cards.filter((card) => card.learned_at !== null && card.box === box)
                  .length
              }
            </span>
          </Chip>
        ))}
        <span className="bg-line-strong mx-1 h-4 w-px" />
        {/* Kolejka zapoznawcza to nie pudełko, tylko stan przed rotacją —
            własny przełącznik w kolorze akcji zamiast szóstej cyfry. */}
        <button
          onClick={() => onBox(boxFilter === 'intro' ? 'all' : 'intro')}
          className={cn(
            'rounded-control text-info flex shrink-0 items-center gap-2 border px-2.5 py-1.5 text-[0.72rem] transition',
            boxFilter === 'intro'
              ? 'border-info/70 bg-info/18'
              : 'border-info/35 hover:bg-info/10',
          )}
        >
          Do zapoznania
          <span className="tabular">{introCount}</span>
        </button>
      </div>
    </>
  )
}

function Row({
  card,
  phases,
  open,
  onToggle,
}: {
  card: Flashcard
  phases: PhaseProgress[]
  open: boolean
  onToggle: () => void
}) {
  const entry = phases.find((item) => item.phase.id === card.phase_id)
  const visual = phaseVisual(entry?.phase.code)
  const waiting = card.learned_at === null

  return (
    <div
      className="border-line flex items-stretch border-b"
      style={{ '--phase': visual.color } as CSSProperties}
    >
      <span className="w-[3px] shrink-0 bg-[var(--phase)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="hover:bg-raised flex w-full items-center gap-4 py-2.5 pl-3.5 text-left transition"
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[0.88rem]',
              waiting ? 'text-ink-muted' : 'text-ink',
            )}
          >
            {card.front}
          </span>
          <Badge color={waiting ? 'var(--color-info)' : undefined}>
            {waiting ? 'Nowa' : `Pudełko ${card.box}`}
          </Badge>
          <span className="text-ink-faint hidden w-40 shrink-0 truncate text-[0.72rem] sm:block">
            {entry
              ? `Faza ${entry.phase.code} · ${phaseTopic(entry.phase.name)}`
              : '— brak fazy —'}
          </span>
          <span
            className={cn(
              'tabular w-24 shrink-0 pr-1 text-right text-[0.72rem]',
              waiting ? 'text-info' : 'text-ink-muted',
            )}
          >
            {waiting ? 'do zapoznania' : dueLabel(card.next_review_at, todayISO())}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open ? <Editor card={card} phases={phases} onClose={onToggle} /> : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Editor({
  card,
  phases,
  onClose,
}: {
  card: Flashcard
  phases: PhaseProgress[]
  onClose: () => void
}) {
  const [front, setFront] = useState(card.front)
  const [back, setBack] = useState(card.back)
  const [note, setNote] = useState(card.own_note)
  const [phaseId, setPhaseId] = useState<number | null>(card.phase_id)
  const [confirming, setConfirming] = useState(false)
  const update = useUpdateFlashcard()
  const remove = useDeleteFlashcard()

  const dirty =
    front !== card.front ||
    back !== card.back ||
    note !== card.own_note ||
    phaseId !== card.phase_id

  function save() {
    if (!dirty) return
    update.mutate(
      { id: card.id, front, back, own_note: note, phase_id: phaseId },
      { onSuccess: onClose },
    )
  }

  const field =
    'border-line text-ink rounded-control w-full resize-y border bg-transparent px-3.5 py-3 text-[0.88rem] leading-relaxed outline-none transition-colors focus:border-[color-mix(in_oklab,var(--phase)_55%,transparent)]'

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="py-3 pr-1 pl-3.5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Przód
            </span>
            <textarea
              value={front}
              onChange={(event) => setFront(event.currentTarget.value)}
              rows={3}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Tył
            </span>
            <textarea
              value={back}
              onChange={(event) => setBack(event.currentTarget.value)}
              rows={3}
              className={field}
            />
          </label>
        </div>

        <label className="mt-3.5 flex flex-col gap-1.5">
          <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
            Moimi słowami
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
            rows={2}
            placeholder="Opcjonalne. Nikt tego nie sprawdza."
            className={cn(field, 'placeholder:text-ink-faint')}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Faza
            </span>
            <select
              value={phaseId ?? ''}
              onChange={(event) =>
                setPhaseId(
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
              className="border-line bg-surface text-ink rounded-control cursor-pointer border px-2.5 py-2 text-[0.8rem]"
            >
              <option value="">— brak fazy —</option>
              {phases.map((entry) => (
                <option key={entry.phase.id} value={entry.phase.id}>
                  Faza {entry.phase.code} · {phaseTopic(entry.phase.name)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2.5">
            {confirming ? (
              <div className="rounded-control border-danger/40 bg-danger/8 flex items-center gap-3 border px-3 py-1.5">
                <span className="text-ink text-[0.78rem]">
                  Usunąć tę fiszkę na stałe?
                </span>
                <button
                  onClick={() => remove.mutate(card.id)}
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
            {/* Przycisk wygaszony, dopóki nic się nie zmieniło — inaczej
                „Zapisz" wygląda jak akcja do wykonania przy każdym otwarciu. */}
            <button
              onClick={save}
              disabled={!dirty || update.isPending}
              className={cn(
                'rounded-control font-display flex items-center gap-2 border px-4 py-2 text-[0.8rem] font-bold transition',
                dirty
                  ? 'border-info/45 bg-info/14 text-ink hover:bg-info/22'
                  : 'border-line text-ink-faint',
              )}
            >
              {update.isPending ? 'Zapisuję…' : dirty ? 'Zapisz zmiany' : 'Bez zmian'}
              {dirty ? <Kbd>⏎</Kbd> : null}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
