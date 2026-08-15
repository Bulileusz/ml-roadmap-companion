import { AppShell } from 'ml-roadmap-frontend'

/**
 * Powłoka aplikacji: lepka nawigacja po lewej i miejsce na treść trasy.
 *
 * Treść przychodzi z routera przez <Outlet />, więc w podglądzie prawa kolumna
 * jest pusta - widać samą nawigację, czyli to, czym ten komponent jest.
 * Podpowiedzi skrótów przy pozycjach pokazują się dopiero pod kursorem.
 */
export function Nawigacja() {
  return <AppShell />
}
