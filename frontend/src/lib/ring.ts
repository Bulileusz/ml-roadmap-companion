/**
 * Długość okręgu i przesunięcie kreski dla danego procenta.
 *
 * Osobny plik, nie funkcja obok komponentu: to jedyna arytmetyka w pierścieniu
 * postępu i jedyne miejsce, gdzie da się pomylić promień ze średnicą, więc ma
 * własny test. Trzymanie jej w ProgressRing.tsx mieszałoby w jednym module
 * komponent i zwykłą funkcję, co wyłącza Fast Refresh dla całego pliku.
 *
 * Procent jest przycinany do 0-100: postęp 100.0001 (zaokrąglenia po stronie
 * API) dawałby ujemne przesunięcie i pierścień domykałby się z drugiej strony.
 */
export function arcDash(pct: number, radius: number) {
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(pct, 0), 100)
  return { circumference, offset: circumference * (1 - clamped / 100) }
}
