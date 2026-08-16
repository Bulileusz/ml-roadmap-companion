import { motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'

import { api } from '@/api/client'
import {
  useContentStatus,
  useImportBackup,
  usePreviewBackup,
  useSyncContent,
} from '@/api/queries'
import type { BackupPreview } from '@/api/types'
import { Page } from '@/components/AppShell'
import { Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'

/**
 * Dane: skąd bierze się treść i jak wynieść historię nauki poza ten dysk.
 *
 * Dwie operacje, obie nieoczywiste w skutkach, więc obie mówią wprost, co
 * zrobią. Doczytanie z `content/` jest idempotentne i bezpieczne. Wczytanie
 * kopii zapasowej kasuje wszystko, co jest — dlatego idzie przez podgląd
 * i osobne potwierdzenie, a nie przez jeden przycisk „importuj".
 */

const CONTENT_LABEL: Record<string, string> = {
  flashcards: 'Fiszki',
  questions: 'Pytania',
  resources: 'Materiały',
}

const TABLE_LABEL: Record<string, string> = {
  phases: 'Fazy',
  tasks: 'Zadania',
  flashcards: 'Fiszki',
  questions: 'Pytania',
  question_attempts: 'Podejścia do pytań',
  resources: 'Materiały',
  activity_log: 'Dziennik zdarzeń',
  content_imports: 'Ewidencja importów',
  day_notes: 'Notatki do dni',
}

export function Dane() {
  return (
    <Page>
      <header className="flex items-baseline justify-between gap-6">
        <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
          Dane
        </h1>
        <span className="text-ink-faint shrink-0 text-[0.72rem]">
          wszystko leży lokalnie, w data/roadmap.db
        </span>
      </header>

      <Tresc />
      <Kopia />
    </Page>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <section className="mt-9">
      <div className="border-line-strong flex items-center gap-3 border-b pb-2">
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          {title}
        </span>
        <span className="bg-line h-px flex-1" />
      </div>
      <p className="text-ink-faint mt-3 text-[0.78rem] leading-relaxed">{hint}</p>
      {children}
    </section>
  )
}

function Tresc() {
  const status = useContentStatus()
  const sync = useSyncContent()
  const result = sync.data

  const kinds = Object.keys(status.data?.available ?? {})

  return (
    <Section
      title="Treść z content/"
      hint="Fiszki, pytania i materiały mają jedno źródło prawdy: pliki w katalogu content/, wersjonowane w gicie. Aplikacja pozwala je zmieniać i kasować, ale nie dodawać — nowe dopisuje się do plików. Import jest idempotentny, więc doczytanie dwa razy nic nie psuje."
    >
      {status.isPending ? (
        <Skeleton className="mt-4 h-24" />
      ) : (
        <div className="mt-4">
          {kinds.map((kind) => {
            const available = status.data?.available[kind] ?? 0
            const imported = status.data?.imported[kind] ?? 0
            const waiting = available - imported
            return (
              <div
                key={kind}
                className="border-line flex items-center gap-4 border-b py-2.5"
              >
                <span className="text-ink min-w-0 flex-1 text-[0.88rem]">
                  {CONTENT_LABEL[kind] ?? kind}
                </span>
                <span className="text-ink-faint tabular text-[0.72rem]">
                  {available} w plikach
                </span>
                <span
                  className={cn(
                    'tabular w-32 shrink-0 text-right text-[0.72rem]',
                    waiting > 0 ? 'text-info' : 'text-ink-faint',
                  )}
                >
                  {waiting > 0 ? `${waiting} do wczytania` : `${imported} wczytanych`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="rounded-control border-info/40 bg-info/10 hover:bg-info/20 font-display text-ink border px-4 py-2.5 text-[0.82rem] font-bold transition disabled:opacity-50"
        >
          {sync.isPending ? 'Czytam pliki…' : 'Doczytaj z content/'}
        </button>
        {sync.isError ? (
          <span className="text-danger text-[0.78rem]">{sync.error.message}</span>
        ) : null}
      </div>

      {result ? (
        <motion.div
          // Wynik pojawia się bez zmiany focusu, więc bez `status` przepadłby
          // dla kogoś, kto nie patrzy na ekran.
          role="status"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-control border-line bg-surface mt-4 border px-4 py-3"
        >
          <p className="text-ink text-[0.82rem]">
            {result.flashcards_added +
              result.questions_added +
              result.resources_added +
              result.answers_filled ===
            0
              ? 'Nic nowego — pliki i baza są zgodne.'
              : [
                  result.flashcards_added ? `${result.flashcards_added} fiszek` : null,
                  result.questions_added ? `${result.questions_added} pytań` : null,
                  result.resources_added
                    ? `${result.resources_added} materiałów`
                    : null,
                  result.answers_filled
                    ? `${result.answers_filled} uzupełnionych odpowiedzi`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
          {result.skipped ? (
            <p className="text-ink-faint mt-1.5 text-[0.72rem]">
              {result.skipped} pozycji pominiętych — były już w bazie.
            </p>
          ) : null}
          {result.warnings.length ? (
            <ul className="mt-2.5 space-y-1">
              {result.warnings.map((warning) => (
                <li key={warning} className="text-warn text-[0.72rem]">
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </motion.div>
      ) : null}
    </Section>
  )
}

function Kopia() {
  const [file, setFile] = useState<File | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const preview = usePreviewBackup()
  const load = useImportBackup()

  function pick(chosen: File | null) {
    load.reset()
    preview.reset()
    setFile(chosen)
    if (chosen) preview.mutate(chosen)
  }

  function clear() {
    pick(null)
    if (picker.current) picker.current.value = ''
  }

  async function download() {
    setDownloadError(null)
    try {
      setDownloaded(await api.download('/api/backup/export', 'roadmap-export.json'))
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Nie udało się pobrać.')
    }
  }

  return (
    <Section
      title="Kopia zapasowa"
      hint="Historia nauki istnieje w jednym egzemplarzu i nie jest w gicie. Przy każdym starcie aplikacja odkłada dzienną migawkę do data/snapshots, ale kopia, która leży na tym samym dysku, chroni tylko przed pomyłką — nie przed dyskiem."
    >
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          onClick={() => void download()}
          className="rounded-control border-line-strong text-ink hover:bg-raised border px-4 py-2.5 text-[0.82rem] transition"
        >
          Pobierz całą bazę jako JSON
        </button>
        {downloaded ? (
          <span className="text-ink-faint text-[0.72rem]">Zapisano {downloaded}</span>
        ) : null}
        {downloadError ? (
          <span className="text-danger text-[0.78rem]">{downloadError}</span>
        ) : null}
      </div>

      <div className="border-line mt-6 border-t pt-5">
        <p className="text-ink text-[0.86rem] font-medium">Wczytanie kopii</p>
        <p className="text-ink-faint mt-1.5 text-[0.78rem] leading-relaxed">
          Zastępuje <span className="text-ink-muted">całą</span> zawartość bazy danymi z
          pliku. Przed nadpisaniem powstaje kopia bezpieczeństwa obok pliku bazy, więc
          pomyłka jest odwracalna — ale tylko z tamtego pliku.
        </p>

        <input
          ref={picker}
          type="file"
          accept="application/json,.json"
          aria-label="Plik kopii zapasowej"
          onChange={(event) => pick(event.currentTarget.files?.[0] ?? null)}
          className="text-ink-faint file:rounded-control file:border-line file:text-ink-muted hover:file:bg-raised mt-4 block w-full text-[0.78rem] file:mr-3 file:cursor-pointer file:border file:bg-transparent file:px-3.5 file:py-2 file:text-[0.78rem] file:transition"
        />

        {preview.isPending ? <Skeleton className="mt-4 h-28" /> : null}
        {preview.isError ? (
          <p className="text-danger mt-4 text-[0.78rem]">{preview.error.message}</p>
        ) : null}

        {preview.data && file && !load.data ? (
          <Podglad
            preview={preview.data}
            importing={load.isPending}
            error={load.isError ? load.error.message : null}
            onConfirm={() => load.mutate(file)}
            onCancel={clear}
          />
        ) : null}

        {load.data ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-control border-success/25 bg-success/8 mt-4 border px-4 py-3.5"
          >
            <p className="text-success text-[0.84rem] font-semibold">
              Baza wczytana z pliku.
            </p>
            <p className="text-ink-muted mt-1.5 text-[0.78rem]">
              Poprzednia zawartość leży w {load.data.backup_path}.
            </p>
            <button
              onClick={clear}
              className="text-ink-faint hover:text-ink mt-3 text-[0.75rem] transition-colors"
            >
              Zamknij
            </button>
          </motion.div>
        ) : null}
      </div>
    </Section>
  )
}

function Podglad({
  preview,
  importing,
  error,
  onConfirm,
  onCancel,
}: {
  preview: BackupPreview
  importing: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const rows = Object.entries(preview.summary).filter(([, count]) => count > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-control border-line bg-surface mt-4 border px-4 py-3.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-ink text-[0.84rem] font-medium">Co jest w tym pliku</span>
        <span className="text-ink-faint tabular text-[0.72rem]">
          {preview.exported_at ? `wyeksportowano ${preview.exported_at}` : 'bez daty'}
          {preview.schema_version !== null
            ? ` · schemat ${preview.schema_version}`
            : ''}
        </span>
      </div>

      <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
        {rows.map(([table, count]) => (
          <div
            key={table}
            className="border-line flex items-baseline gap-3 border-b py-1.5"
          >
            <span className="text-ink-muted min-w-0 flex-1 truncate text-[0.78rem]">
              {TABLE_LABEL[table] ?? table}
            </span>
            <span className="text-ink tabular text-[0.78rem]">{count}</span>
          </div>
        ))}
      </div>

      {preview.compatible ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Przycisk mówi, co zrobi, a nie „OK" — to jedyna operacja w apce,
              która kasuje wszystko naraz. */}
          <button
            onClick={onConfirm}
            disabled={importing}
            className="rounded-control border-danger/45 bg-danger/12 hover:bg-danger/20 font-display text-danger border px-4 py-2.5 text-[0.82rem] font-bold transition disabled:opacity-50"
          >
            {importing ? 'Wczytuję…' : 'Skasuj obecną bazę i wczytaj tę kopię'}
          </button>
          <button
            onClick={onCancel}
            className="text-ink-faint hover:text-ink text-[0.78rem] transition-colors"
          >
            Anuluj
          </button>
          {error ? <span className="text-danger text-[0.78rem]">{error}</span> : null}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-danger text-[0.8rem]">{preview.problem}</p>
          <button
            onClick={onCancel}
            className="text-ink-faint hover:text-ink mt-2.5 text-[0.75rem] transition-colors"
          >
            Wybierz inny plik
          </button>
        </div>
      )}
    </motion.div>
  )
}
