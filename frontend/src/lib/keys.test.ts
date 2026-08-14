import { describe, expect, it, vi } from 'vitest'

import { eventToCombo, isTypingTarget, resolveBinding, type Binding } from './keys'

function binding(keys: string): Binding {
  return { keys, description: keys, handler: vi.fn() }
}

describe('eventToCombo', () => {
  it('zapisuje pojedynczy klawisz małą literą', () => {
    expect(eventToCombo({ key: 'S' })).toBe('s')
    expect(eventToCombo({ key: 'g' })).toBe('g')
  })

  it('spacja i strzałki dostają czytelne nazwy', () => {
    expect(eventToCombo({ key: ' ' })).toBe('space')
    expect(eventToCombo({ key: 'ArrowLeft' })).toBe('left')
    expect(eventToCombo({ key: 'Escape' })).toBe('esc')
  })

  it('Cmd i Ctrl dają ten sam zapis, żeby skrót był jeden na oba systemy', () => {
    expect(eventToCombo({ key: 'k', metaKey: true })).toBe('mod+k')
    expect(eventToCombo({ key: 'k', ctrlKey: true })).toBe('mod+k')
  })

  it('nie dokłada shifta do znaku, który shift właśnie wytworzył', () => {
    // "?" to już efekt shift+/, więc "shift+?" byłoby skrótem niemożliwym
    // do wciśnięcia.
    expect(eventToCombo({ key: '?', shiftKey: true })).toBe('?')
  })

  it('dokłada shifta do klawiszy nazwanych', () => {
    expect(eventToCombo({ key: 'Tab', shiftKey: true })).toBe('shift+tab')
  })
})

describe('isTypingTarget', () => {
  it('rozpoznaje pola tekstowe', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(document.createElement('select'))).toBe(true)
  })

  it('rozpoznaje contenteditable, które nie jest inputem', () => {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    // jsdom nie wylicza isContentEditable z atrybutu, więc podstawiamy je wprost.
    Object.defineProperty(div, 'isContentEditable', { value: true })
    expect(isTypingTarget(div)).toBe(true)
  })

  it('zwykły element i null nie są pisaniem', () => {
    expect(isTypingTarget(document.createElement('div'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('resolveBinding', () => {
  it('trafia w pojedynczy klawisz', () => {
    const bindings = [binding('s'), binding('n')]
    expect(resolveBinding(bindings, 's', null)?.keys).toBe('s')
  })

  it('nie trafia w nic, gdy skrótu nie ma', () => {
    expect(resolveBinding([binding('s')], 'x', null)).toBeUndefined()
  })

  it('akord wygrywa z pojedynczym klawiszem, gdy prefiks wisi', () => {
    const bindings = [binding('d'), binding('g d')]

    expect(resolveBinding(bindings, 'd', null)?.keys).toBe('d')
    // Skoro użytkownik wcisnął "g", to jest w środku sekwencji - "d" ma
    // dokończyć akord, a nie odpalić własny skrót.
    expect(resolveBinding(bindings, 'd', 'g')?.keys).toBe('g d')
  })

  it('wisi prefiks, którego akord nie obsługuje - wraca skrót pojedynczy', () => {
    const bindings = [binding('d'), binding('g f')]
    expect(resolveBinding(bindings, 'd', 'g')?.keys).toBe('d')
  })
})
