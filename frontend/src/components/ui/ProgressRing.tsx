import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { SPRING_VALUE } from '@/lib/motion'
import { arcDash } from '@/lib/ring'

type Props = {
  pct: number
  /** Kolor łuku. Domyślnie barwa fazy z `--phase`, jeśli rodzic ją ustawił. */
  color?: string
  size?: number
  thickness?: number
  children?: ReactNode
  className?: string
  label?: string
}

export function ProgressRing({
  pct,
  color = 'var(--phase, var(--color-info))',
  size = 96,
  thickness = 7,
  children,
  className,
  label,
}: Props) {
  const reduced = useReducedMotion()
  // Promień liczony do środka kreski, nie do krawędzi - inaczej gruby łuk
  // wychodziłby za viewBox i był ucinany po bokach.
  const radius = (size - thickness) / 2
  const { circumference, offset } = arcDash(pct, radius)

  return (
    <div
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(pct)}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-line-strong"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduced ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : SPRING_VALUE}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      ) : null}
    </div>
  )
}
