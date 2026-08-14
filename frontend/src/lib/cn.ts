import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Warunkowe klasy + rozstrzyganie konfliktów Tailwinda (`p-2` vs `p-4`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
