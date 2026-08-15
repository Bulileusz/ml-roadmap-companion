import { Link } from 'react-router'

import { Page } from '@/components/AppShell'
import { NAV } from '@/lib/nav'

/**
 * Nieznany adres.
 *
 * Zastąpił `Placeholder` z etapów migracji: każda trasa z nawigacji ma już swój
 * ekran, więc jedyne, co zostaje pod nieznanym adresem, to literówka w URL-u.
 * Zamiast przepraszać, pokazujemy spis miejsc, które istnieją.
 */
export function NieZnaleziono() {
  return (
    <Page>
      <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
        Nie ma tu nic
      </h1>
      <p className="text-ink-muted mt-3 text-[0.92rem]">
        Ten adres do niczego nie prowadzi. Cała apka mieści się w siedmiu miejscach:
      </p>

      <div className="mt-6">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="border-line text-ink hover:bg-raised flex items-center gap-4 border-b px-1 py-3 text-[0.9rem] transition"
          >
            <span className="min-w-0 flex-1">{item.label}</span>
            <span className="text-ink-faint font-mono text-[0.72rem]">
              g {item.chord}
            </span>
          </Link>
        ))}
      </div>
    </Page>
  )
}
