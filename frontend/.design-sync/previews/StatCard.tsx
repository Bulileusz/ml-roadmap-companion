import { Layers, Sparkles, Target, TrendingUp } from 'lucide-react'
import { StatCard } from 'ml-roadmap-frontend'

/** Rząd wskaźników ze strony startowej - kanoniczne użycie. */
export function RzadWskaznikow() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Postęp roadmapy"
        value="41%"
        sublabel="23 z 56 zadań"
        pct={41}
        color="var(--color-info)"
        icon={Target}
      />
      <StatCard
        label="Do powtórki"
        value={3}
        sublabel="48 fiszek w rotacji"
        color="var(--color-info)"
        icon={Layers}
      />
      <StatCard
        label="Do poznania"
        value={2}
        sublabel="świeże, bez oceniania"
        color="var(--color-ember)"
        icon={Sparkles}
      />
      <StatCard
        label="Samodzielność"
        value="76%"
        sublabel="19 z 25 podejść"
        pct={76}
        color="var(--color-success)"
        icon={TrendingUp}
      />
    </div>
  )
}

/** Wariant licznikowy: duża liczba, bez pierścienia - brak naturalnego maksimum. */
export function Licznik() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Do powtórki" value={12} sublabel="48 fiszek w rotacji" icon={Layers} />
      <StatCard label="Seria" value={12} sublabel="rekord: 31 dni" color="var(--color-ember)" />
    </div>
  )
}

/** Wariant procentowy: pierścień niesie wartość, liczba siedzi w środku. */
export function ZPierscieniem() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Postęp roadmapy"
        value="41%"
        sublabel="23 z 56 zadań"
        pct={41}
        color="var(--color-info)"
        icon={Target}
      />
      <StatCard
        label="Samodzielność"
        value="76%"
        sublabel="19 z 25 podejść"
        pct={76}
        color="var(--color-success)"
        icon={TrendingUp}
      />
    </div>
  )
}

/** Wartość tekstowa („—") trafia na ekran bez animowania - nie ma czego liczyć. */
export function BezDanych() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Samodzielność" value="—" sublabel="brak podejść" icon={TrendingUp} />
      <StatCard label="Do powtórki" value={0} sublabel="wszystko zrobione" icon={Layers} />
    </div>
  )
}
