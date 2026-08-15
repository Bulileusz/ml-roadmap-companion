import { Fragment } from 'react'

import { cn } from './cn'
import { parseInline, splitBlocks } from './prose-parse'

/**
 * Treść fiszki albo odpowiedzi na pytanie.
 *
 * Składa węzły Reacta z tokenów parsera — bez `dangerouslySetInnerHTML`, więc
 * treść nie ma jak stać się HTML-em, choćby ktoś wkleił `<script>` do tyłu
 * fiszki. Parser i jego podzbiór składni opisuje `prose-parse.ts`.
 */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {splitBlocks(text).map((block, index) =>
        block.code ? (
          <pre
            key={index}
            className="border-line bg-raised text-ink overflow-x-auto rounded-lg border p-3.5 font-mono text-[0.82em] leading-relaxed"
          >
            <code>{block.text}</code>
          </pre>
        ) : (
          <p key={index} className="leading-relaxed">
            {parseInline(block.text).map((part, i) => (
              <Fragment key={i}>
                {part.kind === 'code' ? (
                  <code className="bg-raised text-ink rounded px-1 py-0.5 font-mono text-[0.86em]">
                    {part.text}
                  </code>
                ) : part.kind === 'bold' ? (
                  <strong className="text-ink font-semibold">{part.text}</strong>
                ) : (
                  part.text
                )}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  )
}
