import type { Transition, Variants } from 'motion/react'

/**
 * Wspólne presety ruchu. Jedno miejsce, żeby cała apka poruszała się w tym samym
 * rytmie - rozjechane czasy trwania to najczęstszy powód, dla którego interfejs
 * „wygląda dobrze, ale czuje się tanio".
 *
 * Sprężyny, nie krzywe czasowe: klik ma odpowiedzieć od razu i wyhamować, a nie
 * przejechać stałą animację do końca niezależnie od tego, co użytkownik robi.
 */
export const SPRING: Transition = { type: 'spring', stiffness: 400, damping: 32 }

/** Miękka sprężyna dla wejść i większych powierzchni - bez przestrzelenia. */
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 240, damping: 30 }

/** Liczniki i paski postępu: wolniej, bo tu chodzi o odczytanie wartości. */
export const SPRING_VALUE: Transition = { type: 'spring', stiffness: 90, damping: 20 }

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

/** Wejście listy: dzieci pojawiają się kolejno, ale bez teatru. */
export const stagger = (step = 0.04): Transition => ({
  staggerChildren: step,
})

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
} as const
