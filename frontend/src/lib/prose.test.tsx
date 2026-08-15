import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Prose } from './prose'
import { splitBlocks } from './prose-parse'

describe('splitBlocks', () => {
  it('dzieli na akapity po pustej linii', () => {
    expect(splitBlocks('Pierwszy\n\nDrugi')).toEqual([
      { code: false, text: 'Pierwszy' },
      { code: false, text: 'Drugi' },
    ])
  })

  it('pojedyncze złamanie linii zostaje w akapicie', () => {
    // Tyły fiszek łamią wiersze do 80 kolumn — to nie są nowe akapity.
    expect(splitBlocks('Małe k → szum,\nduże k → gładko.')).toEqual([
      { code: false, text: 'Małe k → szum,\nduże k → gładko.' },
    ])
  })

  it('wycina blok kodu razem z pustymi liniami w środku', () => {
    const text = 'Przed\n\n```python\nx = 1\n\ny = 2\n```\n\nPo'

    expect(splitBlocks(text)).toEqual([
      { code: false, text: 'Przed' },
      { code: true, text: 'x = 1\n\ny = 2' },
      { code: false, text: 'Po' },
    ])
  })

  it('pusta treść nie daje pustych akapitów', () => {
    expect(splitBlocks('')).toEqual([])
    expect(splitBlocks('\n\n   \n')).toEqual([])
  })
})

describe('Prose', () => {
  it('renderuje kod w linii jako <code>', () => {
    render(<Prose text="Parametr `k` steruje sąsiedztwem." />)

    const code = screen.getByText('k')
    expect(code.tagName).toBe('CODE')
    expect(screen.getByText(/steruje sąsiedztwem/)).toBeInTheDocument()
  })

  it('renderuje pogrubienie jako <strong>', () => {
    render(<Prose text="Wartości **ujemne są możliwe** na teście." />)

    expect(screen.getByText('ujemne są możliwe').tagName).toBe('STRONG')
  })

  it('nie wpuszcza HTML-u z treści', () => {
    render(<Prose text="Tekst <b>pogrubiony</b> i <script>alert(1)</script>" />)

    // Składamy węzły Reacta, więc znaczniki są treścią, nie strukturą.
    expect(screen.getByText(/<b>pogrubiony<\/b>/)).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })

  it('renderuje blok kodu w <pre>', () => {
    // Nawiasy klamrowe, nie cudzysłów: w atrybucie JSX „\n" to dwa znaki,
    // nie złamanie linii.
    const { container } = render(<Prose text={'```python\nimport numpy\n```'} />)

    expect(container.querySelector('pre')).not.toBeNull()
    expect(screen.getByText('import numpy')).toBeInTheDocument()
  })

  it('grawis bez pary zostaje zwykłym tekstem', () => {
    render(<Prose text="Cena to 100` złotych" />)

    expect(screen.getByText(/100` złotych/)).toBeInTheDocument()
  })
})
