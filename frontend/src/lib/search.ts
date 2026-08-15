/**
 * Normalizacja tekstu pod szukajkę w bibliotece.
 *
 * „regresja" ma znajdować „Regresję", a „lasow" — „lasów". Bez tego szukanie
 * po polsku wymaga trafiania w ogonki, czego nikt nie robi wpisując zapytanie
 * w locie.
 *
 * NFD rozkłada znak na literę bazową i znak diakrytyczny, który potem
 * wycinamy — działa dla ą, ć, ę, ń, ó, ś, ź, ż. `ł` jest wyjątkiem: to osobna
 * litera Unicode bez rozkładu, więc podmieniamy ją ręcznie.
 */
export function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
}

/** Czy `haystack` zawiera `needle`, ignorując wielkość liter i ogonki. */
export function matches(haystack: string, needle: string): boolean {
  const query = fold(needle).trim()
  return query === '' || fold(haystack).includes(query)
}
