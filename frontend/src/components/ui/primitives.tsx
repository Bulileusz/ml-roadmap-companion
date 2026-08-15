import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { SPRING, SPRING_VALUE } from '@/lib/motion'

/* Prymitywy prezentacyjne. Zero domeny i zero zapytań - ten plik importuje
 * niemal każdy widok, więc musi zostać wolny od cykli i od wiedzy o danych. */

/** Powierzchnia. `raised` dokłada wewnętrzną kreskę u góry - to ona daje „szkło". */
export function Card({
  className,
  children,
  ...props
}: ComponentProps<'div'> & { children?: ReactNode }) {
  return (
    <div
      className={cn(
        'bg-surface border-line rounded-card shadow-raise border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BUTTON_VARIANTS = {
  primary: 'bg-info text-canvas hover:brightness-110 font-semibold',
  ghost: 'text-ink-muted hover:text-ink hover:bg-raised',
  outline: 'border border-line-strong text-ink hover:bg-raised',
  danger: 'text-danger hover:bg-danger/10',
} as const

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  variant?: keyof typeof BUTTON_VARIANTS
  size?: keyof typeof BUTTON_SIZES
}) {
  return (
    <button
      className={cn(
        'rounded-control inline-flex items-center justify-center gap-2 transition',
        'disabled:pointer-events-none disabled:opacity-40',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** Etykieta znaczeniowa: pudełko Leitnera, typ pytania, status materiału. */
export function Badge({
  children,
  color,
  className,
}: {
  children: ReactNode
  /** Dowolny kolor CSS; domyślnie barwa fazy z `--phase`. */
  color?: string
  className?: string
}) {
  const tint = color ?? 'var(--phase, var(--color-ink-faint))'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-xs font-medium',
        className,
      )}
      style={{
        color: tint,
        // color-mix zamiast osobnego tokenu na tint: tło zawsze jest tym samym
        // kolorem co tekst, tylko przygaszonym, więc nie ma czego rozjeżdżać.
        backgroundColor: `color-mix(in oklab, ${tint} 14%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}

/**
 * Filtr na pasku nad listą: faza, pudełko, status, typ pytania.
 *
 * Wspólny dla wszystkich bibliotek (fiszki, pytania, materiały) - te ekrany
 * mają wyglądać jak jedno miejsce z trzema zakładkami, a nie jak trzy osobne
 * aplikacje. `color` maluje kropkę i krawędź wybranego filtra barwą fazy.
 */
export function Chip({
  active,
  color,
  onClick,
  children,
  pill = true,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: ReactNode
  /** Prostokątny wariant dla filtrów, które są skalą, nie kategorią. */
  pill?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
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

/** Poziomy pasek postępu - tam, gdzie pierścień byłby przesadą. */
export function ProgressBar({
  pct,
  className,
  color = 'var(--phase, var(--color-info))',
}: {
  pct: number
  className?: string
  color?: string
}) {
  const reduced = useReducedMotion()
  const clamped = Math.min(Math.max(pct, 0), 100)
  return (
    <div
      className={cn(
        'bg-line-strong h-1.5 w-full overflow-hidden rounded-full',
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: reduced ? `${clamped}%` : 0 }}
        animate={{ width: `${clamped}%` }}
        transition={reduced ? { duration: 0 } : SPRING_VALUE}
      />
    </div>
  )
}

/**
 * Liczba dojeżdżająca do wartości sprężyną.
 *
 * Nie ozdoba: kiedy XP rośnie po zrobionej powtórce, przeskok z 23 na 25 jest
 * niezauważalny, a przejechanie tej drogi w pół sekundy - widoczne. To jedyny
 * sygnał, że klik faktycznie coś dodał.
 */
export function AnimatedNumber({
  value,
  className,
  suffix = '',
}: {
  value: number
  className?: string
  suffix?: string
}) {
  const reduced = useReducedMotion()
  const spring = useSpring(value, SPRING_VALUE)
  // MotionValue renderowany wprost jako dziecko, bez useState: subskrypcja
  // sprężyny do stanu Reacta wywoływałaby re-render całego drzewa na każdej
  // klatce animacji, a Framer umie podmieniać sam textContent.
  const rounded = useTransform(spring, (latest) => Math.round(latest))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  if (reduced) {
    return (
      <span className={cn('tabular', className)}>
        {value}
        {suffix}
      </span>
    )
  }

  return (
    <span className={cn('tabular', className)}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}

/** Brak danych - to nie zdarzenie, o którym trzeba krzyczeć. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <p className="text-ink-muted text-sm font-medium">{title}</p>
      {hint ? <p className="text-ink-faint max-w-sm text-xs">{hint}</p> : null}
      {action}
    </div>
  )
}

/**
 * Stan „nic nie zostało" - w odróżnieniu od EmptyState to sukces.
 *
 * Rozdzielenie przeniesione z wersji streamlitowej, gdzie „brak fiszek, dodaj
 * pierwszą" i „wszystkie powtórki zrobione" wyglądały tak samo albo odwrotnie
 * niż powinny.
 */
export function AllDone({ title, hint }: { title: string; hint?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="border-success/25 bg-success/8 rounded-card flex flex-col items-center gap-2 border px-6 py-8 text-center"
    >
      <p className="text-success text-sm font-semibold">{title}</p>
      {hint ? <p className="text-ink-muted text-xs">{hint}</p> : null}
    </motion.div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-raised animate-pulse rounded-lg', className)} />
}

/** Klawisz w podpowiedzi i w ściągawce. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="border-line-strong bg-raised text-ink-muted rounded border px-1.5 py-0.5 font-mono text-[0.7rem] leading-none">
      {children}
    </kbd>
  )
}
