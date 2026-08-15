import { Card, Kbd } from 'ml-roadmap-frontend'

/** Pojedyncze klawisze. */
export function Klawisze() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Kbd>s</Kbd>
      <Kbd>?</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Enter</Kbd>
      <Kbd>⌘</Kbd>
    </div>
  )
}

/** Akord „g …" - dwa klawisze po sobie, tak jak działa nawigacja w apce. */
export function Akord() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex items-center gap-1">
        <Kbd>g</Kbd>
        <Kbd>d</Kbd>
      </span>
      <span className="flex items-center gap-1">
        <Kbd>g</Kbd>
        <Kbd>f</Kbd>
      </span>
      <span className="flex items-center gap-1">
        <Kbd>g</Kbd>
        <Kbd>j</Kbd>
      </span>
    </div>
  )
}

/** W zdaniu i na liście skrótów - dwa miejsca, w których naprawdę występuje. */
export function WKontekscie() {
  return (
    <Card className="p-5">
      <p className="text-ink-muted text-sm">
        Zacznij sesję przyciskiem albo <Kbd>s</Kbd>. Ściągawkę otwiera <Kbd>?</Kbd>.
      </p>
      <ul className="mt-4 space-y-2">
        {[
          ['Start', 'g d'],
          ['Fiszki', 'g f'],
          ['Dziennik', 'g j'],
        ].map(([label, keys]) => (
          <li key={keys} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-ink-muted">{label}</span>
            <span className="flex shrink-0 gap-1">
              {keys!.split(' ').map((k, i) => (
                <Kbd key={i}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
