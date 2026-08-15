import { describe, expect, it } from 'vitest'

import { hostOf, kindLabel, nextStatus } from './resources'

describe('nextStatus', () => {
  it('przesuwa materiał do przodu i wraca na początek', () => {
    expect(nextStatus('todo')).toBe('in_progress')
    expect(nextStatus('in_progress')).toBe('done')
    // Cykl domknięty: pomyłkę da się odkręcić tym samym klikaniem.
    expect(nextStatus('done')).toBe('todo')
  })
})

describe('hostOf', () => {
  it('pokazuje samą domenę, bez www', () => {
    expect(hostOf('https://www.statlearning.com/rozdzial-3')).toBe('statlearning.com')
    expect(hostOf('https://docs.python.org/3/library/')).toBe('docs.python.org')
  })

  it('z tego, co linkiem nie jest, oddaje tekst bez zmian', () => {
    // Pole linku jest wolnym tekstem, więc wpis „papierowa, półka w salonie"
    // ma się wyświetlić, a nie wysadzić wiersz.
    expect(hostOf('papierowa, półka w salonie')).toBe('papierowa, półka w salonie')
  })
})

describe('kindLabel', () => {
  it('nieznany rodzaj degraduje się do etykiety domyślnej', () => {
    expect(kindLabel('book')).toBe('Książka')
    // W bazie nie ma CHECK-a na kind, więc to jest realny stan, nie hipoteza.
    expect(kindLabel('podcast')).toBe('Materiał')
  })
})
