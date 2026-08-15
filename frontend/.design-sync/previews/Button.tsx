import { ArrowRight, Check, Trash2 } from 'lucide-react'
import { Button } from 'ml-roadmap-frontend'

export function Warianty() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Zacznij sesję</Button>
      <Button variant="outline">Pokaż odpowiedź</Button>
      <Button variant="ghost">Pomiń na dziś</Button>
      <Button variant="danger">Usuń fiszkę</Button>
    </div>
  )
}

export function Rozmiary() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Mały</Button>
      <Button size="md">Średni</Button>
      <Button size="lg">Duży</Button>
    </div>
  )
}

export function ZIkona() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" size="lg">
        Zacznij sesję
        <ArrowRight size={17} />
      </Button>
      <Button variant="outline">
        <Check size={16} />
        Umiem
      </Button>
      <Button variant="danger">
        <Trash2 size={15} />
        Usuń
      </Button>
    </div>
  )
}

export function Wylaczony() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" disabled>
        Zacznij sesję
      </Button>
      <Button variant="outline" disabled>
        Pokaż odpowiedź
      </Button>
    </div>
  )
}
