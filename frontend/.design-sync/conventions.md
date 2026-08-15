# ml-roadmap-companion — konwencje

Ciemny motyw „premium edu" do codziennej nauki ML. Zasada nadrzędna: **kolor
niesie znaczenie**. Płótno jest neutralne i ciemne, a jedyną rzeczą, która
świeci, jest treść i postęp.

## Ciemne płótno jest wymagane

Arkusz ustawia `background-color: var(--color-canvas)` i `color: var(--color-ink)`
na `<body>` w `@layer base`. Każdy komponent zakłada to tło — na jasnym tle
`text-ink` (prawie biel) znika. Budując cokolwiek własnego, maluj powierzchnie
tokenami, nie domyślnym tłem przeglądarki.

## Konteksty: kiedy potrzebny jest `DesignPreviewProvider`

Cztery komponenty czytają kontekst i **bez owinięcia renderują się pusto albo
rzucają błędem**:

| Komponent | Czego wymaga |
|---|---|
| `PhaseCard` | klienta TanStack Query (dociąga zadania po rozwinięciu) |
| `AppShell`, `SessionHero` | routera (`NavLink`, `useNavigate`) |
| `HotkeyCheatsheet` | rejestru skrótów — pustego renderuje pusty dialog |

`DesignPreviewProvider` (eksport bundla) dostarcza wszystkie cztery naraz:
`MotionConfig` → `QueryClientProvider` → `MemoryRouter` → `HotkeysProvider`.
Owiń nim całość:

```jsx
<DesignPreviewProvider>
  <StatCard label="Postęp roadmapy" value="41%" pct={41} color="var(--color-info)" icon={Target} />
</DesignPreviewProvider>
```

Uwaga: router jest pamięciowy, a cache zapytań pusty — rozwinięty `PhaseCard`
pokaże stan „brak zadań", dopóki nie dosiejesz danych. Skróty do `HotkeyCheatsheet`
rejestruje się hookiem `useHotkeys` (też eksport bundla).

## Idiom stylowania: Tailwind v4 na tokenach `@theme`

Bez CSS modules i bez styled-components. Układ własny piszesz klasami Tailwinda,
a kolory i kształty bierzesz z tokenów systemu.

**Klasy dostępne w wysłanym arkuszu** (to pełna lista — patrz ostrzeżenie niżej):

| Rodzina | Klasy |
|---|---|
| Powierzchnie | `bg-canvas` `bg-surface` `bg-raised` `bg-line-strong` `bg-info` `bg-success/8` |
| Tekst | `text-ink` `text-ink-muted` `text-ink-faint` `text-success` `text-danger` `text-canvas` |
| Kreski | `border-line` `border-line-strong` `border-success/25` `border-danger/30` |
| Typografia | `font-display` (Plus Jakarta Sans — nagłówki i liczby) `font-sans` (Inter — treść) `font-mono` (JetBrains Mono — tylko kod) |
| Kształt i głębia | `rounded-card` `rounded-control` `shadow-raise` `shadow-lift` |
| Własne | `phase-wash` (radialna poświata w barwie fazy) `tabular` (cyfry o stałej szerokości) |

**Ostrzeżenie — to nie jest pełny Tailwind.** Arkusz zawiera wyłącznie klasy
faktycznie użyte w tym repo, i to dokładnie w użytych wariantach: jest
`bg-success/8`, ale nie ma `bg-success`. `text-info`, `text-warn`, `text-ember`,
`bg-overlay` i `bg-danger` **nie mają reguł** i nie zadziałają. Dla wszystkiego
spoza tabeli używaj zmiennej CSS, która zawsze jest zdefiniowana:

```jsx
<span style={{ color: 'var(--color-ember)' }}>seria</span>
```

Zdefiniowane tokeny koloru: `--color-canvas` `--color-surface` `--color-raised`
`--color-line` `--color-line-strong` `--color-ink` `--color-ink-muted`
`--color-ink-faint` `--color-success` `--color-danger` `--color-warn`
`--color-info` `--color-ember` `--color-ember-bright`. Do tego `--font-display`
`--font-sans` `--font-mono` oraz `--radius-card` `--radius-control`.

## Barwa fazy: `--phase`, nigdy klasa per faza

Każda faza roadmapy ma własną barwę. Nie ma i nie może być klasy Tailwinda per
faza (fazy pochodzą z bazy). Ustawiasz zmienną `--phase` na rodzicu, a `Badge`,
`ProgressRing`, `ProgressBar` i `phase-wash` biorą ją domyślnie:

```jsx
<div style={{ '--phase': '#a855f7' }}>
  <Card className="phase-wash p-5">
    <Badge>Faza 2</Badge>
    <p className="font-display text-ink mt-2 font-bold">Uczenie nadzorowane</p>
    <ProgressBar pct={58} className="mt-3" />
  </Card>
</div>
```

Paleta faz: `0` `#22d3ee`, `1` `#6366f1`, `2` `#a855f7`, `2b` `#ec4899`,
`3` `#fb923c`, `4` `#34d399`.

**Ciepłe barwy są zarezerwowane dla dorobku** (`--color-ember` — seria, XP),
nigdy dla zwykłej akcji. Akcje są chłodne (`--color-info`).

## Gdzie leży prawda

Zanim zaczniesz stylować, przeczytaj `_ds/<folder>/styles.css` i jego importy
(`_ds_bundle.css` niesie tokeny w `@layer theme` oraz komplet reguł). API każdego
komponentu jest w `components/general/<Nazwa>/<Nazwa>.d.ts`, a opis użycia
w `<Nazwa>.prompt.md`.

## Przykład

```jsx
<DesignPreviewProvider>
  <div className="mx-auto max-w-5xl space-y-6">
    <SessionHero plan={plan} />
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Postęp roadmapy" value="41%" sublabel="23 z 56 zadań"
                pct={41} color="var(--color-info)" icon={Target} />
      <StatCard label="Do powtórki" value={3} sublabel="48 fiszek w rotacji"
                color="var(--color-info)" icon={Layers} />
    </section>
  </div>
</DesignPreviewProvider>
```
