/**
 * Polska odmiana przez liczebnik.
 *
 * `Intl.PluralRules('pl-PL')` zamiast ręcznych warunków na `n % 10` i `n % 100`,
 * które wersja streamlitowa miała skopiowane w dwóch miejscach i osobno dla
 * każdego rzeczownika. Przeglądarka zna reguły CLDR-a, więc wystarczy podać trzy
 * formy: pojedynczą, „few" (2-4) i „many" (5+ oraz 12-14).
 */
const RULES = new Intl.PluralRules('pl-PL')

export type PolishForms = {
  one: string
  few: string
  many: string
}

export function plural(count: number, forms: PolishForms): string {
  const category = RULES.select(count)
  if (category === 'one') return forms.one
  if (category === 'few') return forms.few
  // "many" i "other" (ułamki) trafiają na tę samą formę - w apce liczymy
  // wyłącznie sztuki, więc ułamek i tak nie wystąpi.
  return forms.many
}

/** „13 fiszek", „1 fiszka", „2 fiszki" - liczba razem z odmienionym słowem. */
export function counted(count: number, forms: PolishForms): string {
  return `${count} ${plural(count, forms)}`
}

export const CARDS: PolishForms = { one: 'fiszka', few: 'fiszki', many: 'fiszek' }
export const DAYS: PolishForms = { one: 'dzień', few: 'dni', many: 'dni' }
export const TASKS: PolishForms = { one: 'zadanie', few: 'zadania', many: 'zadań' }
export const QUESTIONS: PolishForms = { one: 'pytanie', few: 'pytania', many: 'pytań' }
export const ATTEMPTS: PolishForms = {
  one: 'podejście',
  few: 'podejścia',
  many: 'podejść',
}
export const MINUTES: PolishForms = { one: 'minuta', few: 'minuty', many: 'minut' }
export const REVIEWS: PolishForms = {
  one: 'powtórka',
  few: 'powtórki',
  many: 'powtórek',
}
export const ENTRIES: PolishForms = { one: 'wpis', few: 'wpisy', many: 'wpisów' }
export const RESOURCES: PolishForms = {
  one: 'materiał',
  few: 'materiały',
  many: 'materiałów',
}
