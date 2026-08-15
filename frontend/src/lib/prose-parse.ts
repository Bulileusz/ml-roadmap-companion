/**
 * Parser treści z `content/` — czyste funkcje, zero JSX.
 *
 * Osobno od komponentu, bo moduł mieszający komponenty ze zwykłymi funkcjami
 * traci Fast Refresh. Przy okazji parser da się testować na danych, bez
 * renderowania czegokolwiek.
 *
 * To NIE jest silnik Markdowna: obsługuje dokładnie ten podzbiór, który
 * występuje w tyłach fiszek i odpowiedziach do pytań — akapity, bloki kodu
 * w ogrodzeniu, kod w linii i pogrubienie.
 */

const FENCE = /^```[^\n]*\n([\s\S]*?)```$/

export type Block = { code: boolean; text: string }
export type Inline = { kind: 'text' | 'code' | 'bold'; text: string }

/** Dzieli na akapity i bloki kodu, zachowując kolejność. */
export function splitBlocks(text: string): Block[] {
  const blocks: Block[] = []
  // Ogrodzenia wycinamy pierwsze, żeby pusta linia w środku kodu nie rozbiła
  // bloku na dwa akapity.
  const parts = text.split(/(```[^\n]*\n[\s\S]*?```)/g)

  for (const part of parts) {
    const fenced = part.match(FENCE)
    if (fenced) {
      blocks.push({ code: true, text: fenced[1]?.replace(/\n$/, '') ?? '' })
      continue
    }
    for (const paragraph of part.split(/\n\s*\n/)) {
      const trimmed = paragraph.trim()
      if (trimmed) blocks.push({ code: false, text: trimmed })
    }
  }
  return blocks
}

/** Rozbija akapit na kawałki tekstu, kodu w linii i pogrubień. */
export function parseInline(text: string): Inline[] {
  const parts: Inline[] = []
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ kind: 'text', text: text.slice(last, match.index) })
    }
    if (match[1] !== undefined) parts.push({ kind: 'code', text: match[1] })
    else if (match[2] !== undefined) parts.push({ kind: 'bold', text: match[2] })
    last = pattern.lastIndex
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}
