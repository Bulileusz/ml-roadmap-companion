import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'

import {
  useAnswerQuestion,
  useDeleteQuestion,
  usePhases,
  useQuestions,
  useUpdateQuestion,
} from '@/api/queries'
import type { PhaseProgress, Question, QuestionWithStats } from '@/api/types'
import { Page } from '@/components/AppShell'
import { Badge, Chip, Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { useHotkeys } from '@/lib/hotkeys-context'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import { ATTEMPTS, QUESTIONS, counted } from '@/lib/plural'
import { Prose } from '@/lib/prose'
import { matches } from '@/lib/search'

/**
 * Bank pytań — biblioteka pytań otwartych z historią samodzielności.
 *
 * Jedna faza naraz, bo taki jest kontrakt (`/api/questions?phase_id=`) i taka
 * jest prawda o tych pytaniach: „czym jest bias" bez informacji, że to faza 2,
 * jest pytaniem znikąd. Faza to tutaj zakładka, nie filtr, więc w odróżnieniu
 * od fiszek nie da się jej zdjąć.
 *
 * Pytania się tu nie dodaje — nowe wchodzą wyłącznie z `content/` (patrz
 * README). Można je natomiast rozwiązywać: podejście zapisane stąd liczy się
 * dokładnie tak samo jak w sesji dnia.
 */

const TYPE_LABEL: Record<Question['question_type'], string> = {
  concept: 'Koncept',
  code: 'Kod',
}

/** Próg, od którego wskaźnik samodzielności czyta się jako dobry / do poprawy. */
const SOLO_GOOD = 70
const SOLO_OK = 40

function soloTone(pct: number): string {
  if (pct >= SOLO_GOOD) return 'text-success'
  if (pct >= SOLO_OK) return 'text-ink'
  return 'text-danger'
}

export function Pytania() {
  const phases = usePhases()
  const [chosen, setChosen] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<Question['question_type'] | 'all'>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Domyślnie faza, w której właśnie jesteś — pierwsza nieodhaczona do końca.
  // Wyliczane, nie trzymane w efekcie: stan miałby tu jedno źródło za dużo.
  const entries = phases.data ?? []
  const fallback = entries.find((entry) => entry.done < entry.total) ?? entries[0]
  const phaseId = chosen ?? fallback?.phase.id ?? 0
  const entry = entries.find((item) => item.phase.id === phaseId)
  const visual = phaseVisual(entry?.phase.code)

  const questions = useQuestions(phaseId, phaseId !== 0)

  useHotkeys([
    {
      keys: '/',
      description: 'Szukaj w pytaniach',
      group: 'Pytania',
      handler: () => searchRef.current?.focus(),
    },
    {
      keys: 'esc',
      description: 'Zamknij pytanie / wyjdź z szukajki',
      group: 'Pytania',
      allowWhileTyping: true,
      handler: () => {
        if (document.activeElement === searchRef.current) searchRef.current?.blur()
        else setOpenId(null)
      },
    },
  ])

  const all = questions.data ?? []
  const visible = useMemo(
    () =>
      all.filter((question) => {
        if (typeFilter !== 'all' && question.question_type !== typeFilter) return false
        return (
          query.trim() === '' ||
          matches(question.question_text, query) ||
          matches(question.answer, query)
        )
      }),
    [all, typeFilter, query],
  )

  const attempted = all.reduce((sum, question) => sum + question.stats.total, 0)
  const solo = all.reduce((sum, question) => sum + question.stats.independent, 0)
  const soloPct = attempted === 0 ? 0 : Math.round((solo / attempted) * 100)

  return (
    <Page>
      <div style={{ '--phase': visual.color } as CSSProperties}>
        <header className="flex items-baseline justify-between gap-6">
          <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
            Bank pytań
          </h1>
          <span className="text-ink-faint tabular shrink-0 text-[0.72rem]">
            {questions.isPending
              ? ''
              : attempted === 0
                ? counted(all.length, QUESTIONS)
                : `${counted(all.length, QUESTIONS)} · ${soloPct}% samodzielnie`}
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
            placeholder="Szukaj w treści pytań i w odpowiedziach"
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
            Typ
          </span>
          <Chip
            active={typeFilter === 'all'}
            pill={false}
            onClick={() => setTypeFilter('all')}
          >
            wszystkie
            <span className="text-ink-faint tabular">{all.length}</span>
          </Chip>
          {(['concept', 'code'] as const).map((type) => (
            <Chip
              key={type}
              active={typeFilter === type}
              pill={false}
              onClick={() => setTypeFilter(type)}
            >
              {TYPE_LABEL[type]}
              <span className="text-ink-faint tabular">
                {all.filter((question) => question.question_type === type).length}
              </span>
            </Chip>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3 pb-1">
          <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
            {visible.length === all.length
              ? 'Wszystkie pytania'
              : `${visible.length} z ${all.length}`}
          </span>
          <span className="bg-line h-px flex-1" />
          <span className="text-ink-faint shrink-0 text-[0.66rem]">samodzielność</span>
        </div>

        {questions.isPending ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-display text-ink font-bold">
              {all.length === 0
                ? 'Ta faza nie ma jeszcze pytań.'
                : 'Nic nie pasuje do tych filtrów.'}
            </p>
            <p className="text-ink-faint mt-2 text-xs">
              {all.length === 0
                ? 'Pytania wchodzą z katalogu content/ — dopisz je tam i doczytaj na stronie Dane.'
                : 'Zdejmij filtr typu albo wyczyść szukajkę.'}
            </p>
          </div>
        ) : (
          visible.map((question) => (
            <Row
              key={question.id}
              question={question}
              phases={entries}
              phaseId={phaseId}
              open={openId === question.id}
              onToggle={() =>
                setOpenId((id) => (id === question.id ? null : question.id))
              }
            />
          ))
        )}
      </div>
    </Page>
  )
}

function statLabel(stats: QuestionWithStats['stats']): string {
  if (stats.total === 0) return 'bez podejść'
  return `${stats.independent} z ${stats.total} · ${Math.round(stats.pct)}%`
}

function Row({
  question,
  phases,
  phaseId,
  open,
  onToggle,
}: {
  question: QuestionWithStats
  phases: PhaseProgress[]
  phaseId: number
  open: boolean
  onToggle: () => void
}) {
  const entry = phases.find((item) => item.phase.id === question.phase_id)
  const visual = phaseVisual(entry?.phase.code)
  const untouched = question.stats.total === 0

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
          <span className="text-ink min-w-0 flex-1 truncate text-[0.88rem]">
            {question.question_text}
          </span>
          <Badge>{TYPE_LABEL[question.question_type]}</Badge>
          <span
            className={cn(
              'tabular w-28 shrink-0 pr-1 text-right text-[0.72rem]',
              untouched ? 'text-ink-faint' : soloTone(question.stats.pct),
            )}
          >
            {statLabel(question.stats)}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <Detail
              question={question}
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

function Detail({
  question,
  phases,
  phaseId,
  onClose,
}: {
  question: QuestionWithStats
  phases: PhaseProgress[]
  phaseId: number
  onClose: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [recorded, setRecorded] = useState<boolean | null>(null)
  const answer = useAnswerQuestion(phaseId)
  const hasAnswer = question.answer.trim() !== ''

  function record(solo: boolean) {
    setRecorded(solo)
    // Sprawdzenie odpowiedzi to część wyboru „musiałem sprawdzić" — odsłaniamy
    // ją od razu, żeby nie trzeba było klikać dwa razy w to samo.
    if (!solo) setRevealed(true)
    answer.mutate({ id: question.id, solo })
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="py-3 pr-1 pl-3.5">
        {editing ? (
          <Editor
            question={question}
            phases={phases}
            phaseId={phaseId}
            onDone={() => setEditing(false)}
            onClose={onClose}
          />
        ) : (
          <>
            {revealed ? (
              hasAnswer ? (
                <div>
                  <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
                    Wzorcowa odpowiedź
                  </span>
                  <Prose
                    text={question.answer}
                    className="text-ink-muted mt-2 text-[0.9rem]"
                  />
                </div>
              ) : (
                <p className="text-ink-faint text-[0.82rem]">
                  Do tego pytania nie ma zapisanej wzorcowej odpowiedzi — ocena należy
                  do Ciebie.
                </p>
              )
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="text-ink-muted hover:text-ink text-[0.82rem] transition-colors"
              >
                Pokaż odpowiedź
              </button>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              {recorded === null ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
                    Zapisz podejście
                  </span>
                  <button
                    onClick={() => record(true)}
                    className="rounded-control border-success/30 bg-success/8 hover:bg-success/17 text-success border px-3.5 py-2 text-[0.78rem] transition"
                  >
                    Umiałem sam
                  </button>
                  {/* Bez czerwieni: „musiałem sprawdzić" to uczciwa odpowiedź,
                      nie porażka — dokładnie jak na ekranie sesji. */}
                  <button
                    onClick={() => record(false)}
                    className="rounded-control border-line-strong text-ink-muted hover:bg-raised border px-3.5 py-2 text-[0.78rem] transition"
                  >
                    Musiałem sprawdzić
                  </button>
                </div>
              ) : (
                <span className="text-ink-muted text-[0.78rem]">
                  {answer.isPending
                    ? 'Zapisuję podejście…'
                    : answer.isError
                      ? 'Nie udało się zapisać podejścia.'
                      : `Zapisane: ${recorded ? 'samodzielnie' : 'ze sprawdzeniem'} · ${counted(
                          question.stats.total,
                          ATTEMPTS,
                        )} łącznie`}
                </span>
              )}

              <button
                onClick={() => setEditing(true)}
                className="text-ink-faint hover:text-ink shrink-0 text-[0.78rem] transition-colors"
              >
                Edytuj
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

function Editor({
  question,
  phases,
  phaseId,
  onDone,
  onClose,
}: {
  question: QuestionWithStats
  phases: PhaseProgress[]
  phaseId: number
  onDone: () => void
  onClose: () => void
}) {
  const [text, setText] = useState(question.question_text)
  const [answer, setAnswer] = useState(question.answer)
  const [type, setType] = useState(question.question_type)
  const [target, setTarget] = useState<number | null>(question.phase_id)
  const [confirming, setConfirming] = useState(false)
  const update = useUpdateQuestion(phaseId)
  const remove = useDeleteQuestion(phaseId)

  const dirty =
    text !== question.question_text ||
    answer !== question.answer ||
    type !== question.question_type ||
    target !== question.phase_id

  function save() {
    if (!dirty) return
    update.mutate(
      {
        id: question.id,
        question_text: text,
        answer,
        question_type: type,
        phase_id: target,
      },
      { onSuccess: onDone },
    )
  }

  const field =
    'border-line text-ink rounded-control w-full resize-y border bg-transparent px-3.5 py-3 text-[0.88rem] leading-relaxed outline-none transition-colors focus:border-[color-mix(in_oklab,var(--phase)_55%,transparent)]'
  const select =
    'border-line bg-surface text-ink rounded-control cursor-pointer border px-2.5 py-2 text-[0.8rem]'

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          Pytanie
        </span>
        <textarea
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          rows={2}
          className={field}
        />
      </label>

      <label className="mt-3.5 flex flex-col gap-1.5">
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          Wzorcowa odpowiedź
        </span>
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.currentTarget.value)}
          rows={4}
          placeholder={
            'Opcjonalna. Bez niej „musiałem sprawdzić" nie ma dokąd odesłać.'
          }
          className={cn(field, 'placeholder:text-ink-faint')}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Typ
            </span>
            <select
              aria-label="Typ pytania"
              value={type}
              onChange={(event) =>
                setType(event.currentTarget.value as Question['question_type'])
              }
              className={select}
            >
              <option value="concept">Koncept</option>
              <option value="code">Kod</option>
            </select>
          </label>
          <label className="flex items-center gap-2.5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
              Faza
            </span>
            <select
              aria-label="Faza pytania"
              value={target ?? ''}
              onChange={(event) =>
                setTarget(
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
              className={select}
            >
              <option value="">— brak fazy —</option>
              {phases.map((item) => (
                <option key={item.phase.id} value={item.phase.id}>
                  Faza {item.phase.code} · {phaseTopic(item.phase.name)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {confirming ? (
            <div className="rounded-control border-danger/40 bg-danger/8 flex items-center gap-3 border px-3 py-1.5">
              <span className="text-ink text-[0.78rem]">
                Usunąć pytanie razem z historią podejść?
              </span>
              <button
                onClick={() => remove.mutate(question.id, { onSuccess: onClose })}
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
            onClick={onDone}
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
    </>
  )
}
