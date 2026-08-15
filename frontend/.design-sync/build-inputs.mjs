// Przygotowuje wejścia, których konwerter design-sync nie potrafi wziąć wprost
// z tego repo, bo front jest aplikacją, a nie publikowaną biblioteką.
//
// Trzy kroki, wszystkie deterministyczne i wszystkie do .design-sync/.cache/
// (gitignorowany - to półprodukty, nie źródła):
//
//  1. Deklaracje .d.ts. Bez nich ekstraktor propsów nie ma czego czytać
//     i wystawia agentowi projektowemu pusty kontrakt `[key: string]: unknown`.
//     Emituje je kompilator repo, więc typy są prawdziwe, a nie przepisane.
//  2. Mostek index.d.ts w korzeniu drzewa typów. Konwerter bierze katalog typów
//     z `dirname(package.json:types)` i skanuje go w dół, więc wejście musi
//     leżeć NAD src/ - a alias `@/` trzeba przepisać na ścieżki względne, bo
//     tsc zostawia go w .d.ts nietkniętego i sam ekstraktor go nie rozwiąże.
//  3. Arkusz Tailwinda. Jedyny skompilowany CSS w repo powstaje przy
//     `vite build` pod zahaszowaną nazwą; tu kompilujemy ten sam theme.css
//     tym samym Tailwindem do stabilnej ścieżki. Skanujemy też previews/,
//     żeby klasa użyta tylko w karcie podglądu miała swoją regułę.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CACHE = resolve(HERE, '.cache')
const TYPES = resolve(CACHE, 'types')

mkdirSync(CACHE, { recursive: true })
mkdirSync(resolve(HERE, 'previews'), { recursive: true })

// ── 1. deklaracje ──────────────────────────────────────────────────────────
execFileSync('npx', ['tsc', '-p', resolve(HERE, 'tsconfig.types.json')], {
  cwd: resolve(HERE, '..'),
  stdio: 'inherit',
})
console.error('[TYPES] .d.ts wyemitowane')

// ── 2. mostek index.d.ts ───────────────────────────────────────────────────
// Przepisujemy wprost entry.ts, żeby lista eksportów miała jedno źródło prawdy.
const entry = readFileSync(resolve(HERE, 'entry.ts'), 'utf8')
const bridge = entry
  .split('\n')
  .filter((line) => /^export\s/.test(line))
  .map((line) =>
    line
      .replace(/'@\//g, "'./src/")
      .replace(/'\.\/preview-provider'/, "'./.design-sync/preview-provider'"),
  )
  .join('\n')

writeFileSync(resolve(TYPES, 'index.d.ts'), `${bridge}\n`)
console.error(`[TYPES] mostek index.d.ts (${bridge.split('\n').length} reeksportów)`)

// ── 3. arkusz Tailwinda ────────────────────────────────────────────────────
const { compile } = await import('@tailwindcss/node')
const { Scanner } = await import('@tailwindcss/oxide')

// preview-provider.tsx jest wymieniony osobno: leży poza src/ i poza previews/,
// więc żaden z pozostałych @source go nie łapie - a to on maluje ciemne płótno
// pod kartami, czyli klasy, bez których cały podgląd jest nieczytelny.
const INPUT = `@import "../src/styles/theme.css";
@source "../src";
@source "./previews";
@source "./preview-provider.tsx";
`

const compiler = await compile(INPUT, { base: HERE, onDependency: () => {} })

// Ta sama logika co w CLI Tailwinda: jawne `@source` plus katalog autodetekcji,
// o ile import nie wyłączył go przez `source(none)`.
const sources = [...compiler.sources]
if (compiler.root && compiler.root !== 'none') {
  sources.unshift({
    base: compiler.root.base,
    pattern: compiler.root.pattern,
    negated: false,
  })
}

const candidates = new Scanner({ sources }).scan()
const css = compiler.build(candidates)
writeFileSync(resolve(CACHE, 'compiled.css'), css)
console.error(
  `[CSS] ${candidates.length} klas -> .cache/compiled.css (${(css.length / 1024).toFixed(1)} kB)`,
)
