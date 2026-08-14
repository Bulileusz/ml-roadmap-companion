import { Construction } from 'lucide-react'

import { Card, EmptyState } from '@/components/ui/primitives'

/**
 * Trasa jeszcze niezaimplementowana.
 *
 * Świadomie widoczna, a nie ukryta w nawigacji: migracja idzie etapami i lepiej,
 * żeby było jasno powiedziane „to dojdzie w następnym kroku", niż żeby link
 * prowadził w pustkę albo zniknął i nie było wiadomo, że czegoś brakuje.
 */
export function Placeholder({
  title,
  plannedIn,
}: {
  title: string
  plannedIn: string
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight">
        {title}
      </h1>
      <Card className="mt-5">
        <EmptyState
          icon={<Construction size={28} strokeWidth={1.5} />}
          title="Ten moduł jest w drodze"
          hint={`Domena i API są gotowe — brakuje widoku. Plan: ${plannedIn}.`}
        />
      </Card>
    </div>
  )
}
