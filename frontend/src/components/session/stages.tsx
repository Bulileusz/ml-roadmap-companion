import { motion } from 'motion/react'
import { useRef, useState, type ReactNode, type RefObject } from 'react'

import type { Flashcard, Question } from '@/api/types'
import { Kbd } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { intervalDays, nextBox, promotionLabel, whenLabel } from '@/lib/leitner'
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
  tone: 'danger' | 'success'
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
        tone === 'danger'
          ? 'border-danger/30 bg-danger/8 hover:bg-danger/17 hover:border-danger/55'
          : 'border-success/30 bg-success/8 hover:bg-success/17 hover:border-success/55',
      )}
    >
      <span
        className={cn(
          'font-display text-[0.98rem] font-bold',
          tone === 'danger' ? 'text-danger' : 'text-success',
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

export function IntroStage({
  card,
  onSaveNote,
  onNext,
  noteRef,
}: {
  card: Flashcard
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
          <Label>Zapoznanie · bez oceniania</Label>
          <Prompt>{card.front}</Prompt>

          <div className="bg-line my-7 h-px" />
          <Prose text={card.back} className="text-ink-muted text-[1.05rem]" />

          <div className="border-line bg-raised rounded-control mt-9 border p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <label
                htmlFor="own-note"
                className="font-display text-ink text-[0.82rem] font-bold"
              >
                Moimi słowami
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
              className="border-line bg-surface text-ink placeholder:text-ink-faint min-h-[4.9rem] w-full resize-y rounded-[10px] border px-3.5 py-3 text-sm leading-relaxed outline-none focus:border-[var(--phase)]"
            />
          </div>
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-5">
          <span className="text-ink-faint text-[0.72rem]">
            Notatka zapisuje się przy fiszce.
          </span>
          <div className="flex items-center gap-3">
            <Kbd>Enter</Kbd>
            <button
              onClick={next}
              className="rounded-control font-display text-ink border border-[color-mix(in_oklab,var(--phase)_45%,transparent)] bg-[color-mix(in_oklab,var(--phase)_16%,transparent)] px-6 py-2.5 text-[0.88rem] font-bold transition hover:bg-[color-mix(in_oklab,var(--phase)_28%,transparent)]"
            >
              Rozumiem, dalej
            </button>
          </div>
        </div>
      }
    />
  )
}

/* ── Pytanie ─────────────────────────────────────────────────────────────── */

const QUESTION_KIND = { concept: 'koncepcyjne', code: 'kodowe' } as const

export function QuizStage({
  question,
  onAnswer,
  onNext,
}: {
  question: Question
  /** Zapis podejścia do backendu — od razu po wyborze. */
  onAnswer: (solo: boolean) => void
  /** Przejście dalej — niesie ten sam wybór, żeby wynik sesji się zgadzał. */
  onNext: (solo: boolean) => void
}) {
  const [choice, setChoice] = useState<boolean | null>(null)
  const answer = question.answer.trim()

  function choose(solo: boolean) {
    setChoice(solo)
    onAnswer(solo)
    // Bez odpowiedzi w bazie nie ma czego pokazywać — od razu dalej.
    if (!answer) onNext(solo)
  }

  return (
    <StageLayout
      body={
        <>
          <Label>Pytanie · {QUESTION_KIND[question.question_type]}</Label>
          <Prompt>{question.question_text}</Prompt>

          {choice !== null && answer ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.25, 1] }}
            >
              <div className="bg-line-strong my-8 h-px" />
              <Label>Odpowiedź</Label>
              <Prose text={answer} className="text-ink-muted mt-3 text-[1.05rem]" />
            </motion.div>
          ) : null}
        </>
      }
      footer={
        choice === null ? (
          <div className="grid grid-cols-2 gap-3">
            <GradeTile
              tone="success"
              label="Rozwiązałem samodzielnie"
              hint="+5 XP i premia za samodzielność"
              shortcut="1"
              onClick={() => choose(true)}
            />
            <GradeTile
              tone="danger"
              label="Musiałem sprawdzić"
              hint={
                answer ? 'odsłoni odpowiedź' : 'to pytanie nie ma jeszcze odpowiedzi'
              }
              shortcut="2"
              onClick={() => choose(false)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-5">
            <span className="text-ink-faint text-[0.72rem]">
              {choice
                ? 'Zapisane jako rozwiązane samodzielnie.'
                : 'Zapisane jako sprawdzone.'}
            </span>
            <div className="flex items-center gap-3">
              <Kbd>Enter</Kbd>
              <button
                onClick={() => onNext(choice)}
                className="rounded-control font-display text-ink border border-[color-mix(in_oklab,var(--phase)_45%,transparent)] bg-[color-mix(in_oklab,var(--phase)_16%,transparent)] px-6 py-2.5 text-[0.88rem] font-bold transition hover:bg-[color-mix(in_oklab,var(--phase)_28%,transparent)]"
              >
                Dalej
              </button>
            </div>
          </div>
        )
      }
    />
  )
}
