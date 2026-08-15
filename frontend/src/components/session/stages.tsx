import { motion } from 'motion/react'
import { useRef, useState, type ReactNode, type RefObject } from 'react'

import type { Flashcard, QuestionWithStats } from '@/api/types'
import { Badge, Kbd } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { intervalDays, nextBox, promotionLabel, whenLabel } from '@/lib/leitner'
import { XP } from '@/lib/session-machine'
import { Prose } from '@/lib/prose'

/* Etapy sesji. Wspólny szkielet: treść na środku, akcje w pasku na dole.
 * Pytanie dostaje duży stopień pisma na gołym płótnie — w momencie, w którym
 * próbujesz sobie coś przypomnieć, na ekranie nie ma być nic poza pytaniem. */

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
      {children}
    </span>
  )
}

export function Prompt({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-ink mt-3.5 text-[1.65rem] leading-snug font-bold tracking-tight text-pretty md:text-[2.1rem]">
      {children}
    </p>
  )
}

export function StageLayout({ body, footer }: { body: ReactNode; footer: ReactNode }) {
  return (
    <>
      <div
        className="flex flex-1 flex-col justify-center overflow-auto px-6 pb-10 md:px-12"
        style={{
          background:
            'radial-gradient(78% 52% at 50% 0%, color-mix(in oklab, var(--phase) 10%, transparent), transparent 72%)',
        }}
      >
        <div className="mx-auto w-full max-w-[47.5rem] py-8">{body}</div>
      </div>
      <div className="border-line shrink-0 border-t px-6 py-4 md:px-12">
        <div className="mx-auto w-full max-w-[47.5rem]">{footer}</div>
      </div>
    </>
  )
}

/* ── Powtórka ────────────────────────────────────────────────────────────── */

export function ReviewStage({
  card,
  box,
  revealed,
  promo,
  onReveal,
  onGrade,
}: {
  card: Flashcard
  box: number
  revealed: boolean
  promo: { from: number; to: number } | null
  onReveal: () => void
  onGrade: (correct: boolean) => void
}) {
  return (
    <StageLayout
      body={
        <>
          <Label>Pytanie</Label>
          <Prompt>{card.front}</Prompt>

          {revealed ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.25, 1] }}
            >
              <div className="bg-line-strong my-8 h-px" />
              <Label>Odpowiedź</Label>
              <Prose text={card.back} className="text-ink-muted mt-3 text-[1.05rem]" />
              {card.own_note ? (
                <div className="border-line bg-raised mt-6 rounded-xl border p-4">
                  <Label>Moimi słowami</Label>
                  <Prose text={card.own_note} className="text-ink-muted mt-2 text-sm" />
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </>
      }
      footer={
        promo ? (
          <BoxPromotion from={promo.from} to={promo.to} />
        ) : revealed ? (
          <div className="grid grid-cols-2 gap-3">
            <GradeTile
              tone="danger"
              label="Nie umiałem"
              hint="wraca dziś, pudełko 1"
              shortcut="1"
              onClick={() => onGrade(false)}
            />
            <GradeTile
              tone="success"
              label="Umiałem"
              hint={promotionLabel(box)}
              shortcut="2"
              onClick={() => onGrade(true)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-6 py-2">
            <button
              onClick={onReveal}
              className="text-ink-muted hover:text-ink flex items-center gap-3 text-sm transition-colors"
            >
              <Kbd>Spacja</Kbd>
              <span>odsłoń odpowiedź</span>
            </button>
            <span className="text-ink-faint hidden text-[0.72rem] sm:block">
              awans do pudełka {nextBox(box, true)} przy trafieniu
            </span>
          </div>
        )
      }
    />
  )
}

function GradeTile({
  tone,
  label,
  hint,
  shortcut,
  onClick,
}: {
  tone: 'danger' | 'success' | 'neutral'
  label: string
  hint: string
  shortcut: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-control relative flex flex-col gap-1.5 border px-5 py-4 text-left transition hover:-translate-y-0.5',
        tone === 'danger' &&
          'border-danger/30 bg-danger/8 hover:bg-danger/17 hover:border-danger/55',
        tone === 'success' &&
          'border-success/30 bg-success/8 hover:bg-success/17 hover:border-success/55',
        // Neutralny wariant dla „musiałem sprawdzić": to nie jest porażka,
        // tylko uczciwa odpowiedź, więc nie dostaje czerwieni.
        tone === 'neutral' && 'border-line-strong hover:bg-raised',
      )}
    >
      <span
        className={cn(
          'font-display text-[0.98rem] font-bold',
          tone === 'danger' && 'text-danger',
          tone === 'success' && 'text-success',
          tone === 'neutral' && 'text-ink-muted',
        )}
      >
        {label}
      </span>
      <span className="text-ink-faint text-[0.72rem]">{hint}</span>
      <span className="text-ink-faint absolute top-3 right-3.5 font-mono text-[0.66rem]">
        {shortcut}
      </span>
    </button>
  )
}

/**
 * Takt awansu pudełka.
 *
 * W Leitnerze przeskok pudełka to jedyny sygnał postępu na pojedynczej karcie,
 * więc dostaje własną chwilę zamiast przemknąć. Pokazywany wyłącznie przy
 * trafieniu — zatrzymywanie użytkownika na sekundę przy „3 → 1" byłoby taktem
 * kary, a wpadka ma iść dalej od razu.
 */
function BoxPromotion({ from, to }: { from: number; to: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.25, 1] }}
      className="rounded-control border-success/25 bg-raised flex items-center justify-center gap-5 border px-6 py-4"
    >
      <Label>Pudełko</Label>
      <div className="font-display tabular flex items-center gap-4 font-extrabold">
        <span className="text-ink-faint text-xl">{from}</span>
        <span className="text-success text-sm">→</span>
        <motion.span
          className="text-success text-3xl leading-none"
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.36, ease: [0.2, 0.9, 0.3, 1.4] }}
        >
          {to}
        </motion.span>
      </div>
      <span className="bg-line h-5 w-px" />
      <span className="text-ink-muted text-[0.78rem]">
        wraca {whenLabel(intervalDays(to))}
      </span>
    </motion.div>
  )
}

/* ── Zapoznanie ──────────────────────────────────────────────────────────── */

/** Opóźnienie zapisu notatki — jeden PATCH na pauzę w pisaniu, nie na znak. */
const NOTE_DEBOUNCE_MS = 700
const XP_INTRO = XP.intro

export function IntroStage({
  card,
  phaseName,
  quota,
  onSaveNote,
  onNext,
  noteRef,
}: {
  card: Flashcard
  phaseName: string
  quota: { index: number; total: number }
  onSaveNote: (note: string) => void
  onNext: (note: string) => void
  noteRef: RefObject<HTMLTextAreaElement | null>
}) {
  // Notatka jest stanem tej karty, nie sesji: komponent jest kluczowany krokiem,
  // więc przy następnej karcie montuje się od nowa z jej własną treścią.
  const [note, setNote] = useState(card.own_note)
  const [pending, setPending] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function change(value: string) {
    setNote(value)
    setPending(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onSaveNote(value)
      setPending(false)
    }, NOTE_DEBOUNCE_MS)
  }

  function next() {
    // Wyjście z karty musi wyprzedzić debounce, inaczej ostatnie znaki
    // przepadłyby razem z odmontowanym timerem.
    if (timer.current) clearTimeout(timer.current)
    onNext(note)
  }

  return (
    <StageLayout
      body={
        <>
          <div className="flex items-center gap-3">
            <Label>Zapoznanie · bez oceniania</Label>
            <span className="bg-line h-px flex-1" />
            <span className="shrink-0 text-[0.72rem] text-[var(--phase)]">
              {phaseName}
            </span>
          </div>
          <Prompt>{card.front}</Prompt>

          <div className="bg-line-strong my-7 h-px" />
          <Prose text={card.back} className="text-ink-muted text-[1.05rem]" />

          <div className="mt-9">
            <div className="flex items-baseline justify-between gap-4 pb-2.5">
              <label htmlFor="own-note">
                <Label>Moimi słowami</Label>
              </label>
              <span className="text-ink-faint text-[0.7rem]">
                {pending ? 'zapisuję…' : note.trim() ? 'zapisano' : 'opcjonalne'}
              </span>
            </div>
            <textarea
              id="own-note"
              ref={noteRef}
              value={note}
              onChange={(event) => change(event.currentTarget.value)}
              rows={3}
              placeholder="Napisz to tak, jak byś tłumaczył koledze. Nikt tego nie sprawdza."
              className="border-line text-ink placeholder:text-ink-faint rounded-control min-h-[5.4rem] w-full resize-y border bg-transparent px-4 py-3.5 text-[0.9rem] leading-relaxed transition-colors outline-none focus:border-[color-mix(in_oklab,var(--phase)_55%,transparent)]"
            />
          </div>
        </>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Jawna konsekwencja przycisku: co się stanie z kartą, ile za to
              jest i która to karta z dzisiejszego limitu. */}
          <div className="text-ink-faint flex min-w-0 items-center gap-3.5 text-[0.72rem]">
            <span>Wejdzie do pudełka 1 · powtórka jutro</span>
            <span className="bg-line-strong h-3 w-px" />
            <span className="tabular text-[var(--color-ember)]">+{XP_INTRO} XP</span>
            <span className="bg-line-strong h-3 w-px" />
            <span className="tabular">
              nowa karta {quota.index} z {quota.total}
            </span>
          </div>
          <button
            onClick={next}
            className="rounded-control font-display text-ink flex items-center gap-3 border border-[color-mix(in_oklab,var(--phase)_45%,transparent)] bg-[color-mix(in_oklab,var(--phase)_14%,transparent)] px-5 py-3 text-[0.88rem] font-bold transition hover:-translate-y-px hover:bg-[color-mix(in_oklab,var(--phase)_26%,transparent)]"
          >
            <span>Rozumiem, dalej</span>
            <Kbd>Enter</Kbd>
          </button>
        </div>
      }
    />
  )
}

/* ── Pytanie ─────────────────────────────────────────────────────────────── */

const QUESTION_KIND = { concept: 'Koncept', code: 'Kod' } as const

/** Próg, od którego wskaźnik samodzielności czyta się jako dobry / do poprawy. */
const SOLO_GOOD = 70
const SOLO_OK = 40

export function QuizStage({
  question,
  position,
  onAnswer,
  onNext,
}: {
  question: QuestionWithStats
  position: { index: number; total: number }
  /** Zapis podejścia do backendu — od razu po wyborze. */
  onAnswer: (solo: boolean) => void
  /** Przejście dalej — niesie ten sam wybór, żeby wynik sesji się zgadzał. */
  onNext: (solo: boolean) => void
}) {
  const [choice, setChoice] = useState<boolean | null>(null)
  const answer = question.answer.trim()
  const { stats } = question

  function choose(solo: boolean) {
    setChoice(solo)
    onAnswer(solo)
  }

  // Wskaźnik po doliczeniu tego podejścia — front liczy to sam, bo backend
  // zwraca go dopiero w odpowiedzi, a liczba ma się pojawić natychmiast.
  const solved = stats.independent + (choice ? 1 : 0)
  const attempts = stats.total + (choice === null ? 0 : 1)
  const pct = attempts === 0 ? 0 : Math.round((solved / attempts) * 100)
  const tone =
    pct >= SOLO_GOOD ? 'text-success' : pct >= SOLO_OK ? 'text-ink' : 'text-danger'
  const last = position.index >= position.total

  return (
    <StageLayout
      body={
        <>
          <div className="flex items-center gap-3">
            <Label>
              Pytanie {position.index} / {position.total}
            </Label>
            <Badge>{QUESTION_KIND[question.question_type]}</Badge>
            <span className="bg-line h-px flex-1" />
            <span className="text-ink-faint shrink-0 text-[0.72rem]">
              {stats.total === 0
                ? 'pierwsze podejście'
                : `samodzielnie ${stats.independent} z ${stats.total}`}
            </span>
          </div>
          <Prompt>{question.question_text}</Prompt>

          {choice !== null ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.25, 1] }}
            >
              <div className="bg-line-strong my-8 h-px" />
              {answer ? (
                <>
                  <Label>Wzorcowa odpowiedź</Label>
                  <Prose text={answer} className="text-ink-muted mt-3 text-[1.05rem]" />
                </>
              ) : (
                <p className="text-ink-faint text-[0.86rem] text-pretty">
                  Do tego pytania nie ma zapisanej wzorcowej odpowiedzi — ocena należy
                  do Ciebie.
                </p>
              )}
            </motion.div>
          ) : null}
        </>
      }
      footer={
        choice === null ? (
          <div className="grid grid-cols-2 gap-3">
            <GradeTile
              tone="neutral"
              label="Musiałem sprawdzić"
              hint={
                answer
                  ? '5 XP · odsłania odpowiedź'
                  : '5 XP · brak wzorcowej odpowiedzi'
              }
              shortcut="1"
              onClick={() => choose(false)}
            />
            <GradeTile
              tone="success"
              label="Rozwiązałem samodzielnie"
              hint="5 XP + 3 XP za samodzielność"
              shortcut="2"
              onClick={() => choose(true)}
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.25, 1] }}
            className="rounded-control border-line bg-raised flex flex-wrap items-center justify-between gap-5 border px-5 py-3.5"
          >
            <div className="flex min-w-0 items-baseline gap-3.5">
              <Label>Samodzielność</Label>
              <motion.span
                className={cn(
                  'font-display tabular text-2xl font-extrabold tracking-tight',
                  tone,
                )}
                initial={{ scale: 0.55, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.34, ease: [0.2, 0.9, 0.3, 1.4] }}
              >
                {pct}%
              </motion.span>
              <span className="text-ink-faint text-xs">
                samodzielnie {solved} z {attempts}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-display tabular text-[0.88rem] font-bold text-[var(--color-ember)]">
                +{choice ? 8 : 5} XP
              </span>
              <button
                onClick={() => onNext(choice)}
                className="rounded-control font-display text-ink flex items-center gap-2.5 border border-[color-mix(in_oklab,var(--phase)_45%,transparent)] bg-[color-mix(in_oklab,var(--phase)_14%,transparent)] px-4 py-2.5 text-[0.84rem] font-bold whitespace-nowrap transition hover:bg-[color-mix(in_oklab,var(--phase)_26%,transparent)]"
              >
                <span>{last ? 'Zamknij sesję' : 'Następne pytanie'}</span>
                <Kbd>Enter</Kbd>
              </button>
            </div>
          </motion.div>
        )
      }
    />
  )
}
