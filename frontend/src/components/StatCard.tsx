import type { LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'

import { ProgressRing } from '@/components/ui/ProgressRing'
import { AnimatedNumber, Card } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { SPRING } from '@/lib/motion'

/**
 * Kafelek wskaźnika. Duża liczba to treść, wszystko inne jest podpisem.
 *
 * Wariant z pierścieniem dla wartości procentowych (postęp, samodzielność) i bez
 * dla liczników (fiszki na dziś, seria) - pierścień przy liczbie bez naturalnego
 * maksimum sugerowałby skalę, której nie ma.
 */
export function StatCard({
  label,
  value,
  sublabel,
  pct,
  color,
  icon: Icon,
  className,
}: {
  label: string
  /** Liczba jest animowana; string trafia na ekran bez zmian (np. „—"). */
  value: number | string
  sublabel?: string
  pct?: number
  color?: string
  icon?: LucideIcon
  className?: string
}) {
  const number =
    typeof value === 'number' ? (
      <AnimatedNumber value={value} />
    ) : (
      <span className="tabular">{value}</span>
    )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      style={color ? ({ '--phase': color } as React.CSSProperties) : undefined}
      className={cn('min-w-0', className)}
    >
      <Card className="flex h-full items-center gap-4 p-4">
        {pct === undefined ? (
          <div className="min-w-0 flex-1">
            <Head label={label} icon={Icon} />
            <p className="font-display text-ink mt-1 text-3xl leading-none font-extrabold tracking-tight">
              {number}
            </p>
            {sublabel ? (
              <p className="text-ink-faint mt-1.5 truncate text-xs">{sublabel}</p>
            ) : null}
          </div>
        ) : (
          <>
            <ProgressRing
              pct={pct}
              size={64}
              thickness={6}
              label={`${label}: ${value}`}
            >
              <span className="font-display text-ink text-sm font-bold">{number}</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <Head label={label} icon={Icon} />
              {sublabel ? (
                <p className="text-ink-faint mt-1 truncate text-xs">{sublabel}</p>
              ) : null}
            </div>
          </>
        )}
      </Card>
    </motion.div>
  )
}

function Head({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    <p className="text-ink-muted flex items-center gap-1.5 text-xs font-medium">
      {Icon ? <Icon size={13} className="text-[var(--phase,currentColor)]" /> : null}
      {label}
    </p>
  )
}
