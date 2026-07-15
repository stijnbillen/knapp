import { useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playPop } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'
import DIEREN_JSON from '../eierendieren/dieren.json'
import SPECIALE_JSON from '../eierendieren/specialeDieren.json'
import PAREN_JSON from '../../spelen/fotoverschillen/paren.json'
import type { PuzzelVorm, Stukje } from './puzzelStukjes'
import { PUZZEL_OPTIES, VORM_OPTIES, bouwStukjes, tekenStukjeOpCanvas } from './puzzelStukjes'

const MODULE_ID = 'puzzel'
const base = import.meta.env.BASE_URL

interface PuzzelAfbeelding {
  id: string
  titel: string
  src: string
}

function bouwAfbeeldingenLijst(): PuzzelAfbeelding[] {
  const lijst: PuzzelAfbeelding[] = []
  for (const d of DIEREN_JSON as { id: string; nl: string; foto?: string }[]) {
    if (d.foto) lijst.push({ id: 'dier-' + d.id, titel: d.nl, src: d.foto })
  }
  for (const d of SPECIALE_JSON as { id: string; nl: string; foto?: string }[]) {
    if (d.foto) lijst.push({ id: 'speciaal-' + d.id, titel: d.nl, src: d.foto })
  }
  for (const p of PAREN_JSON as { id: string }[]) {
    lijst.push({ id: 'verschillen-' + p.id, titel: `Foto-paar ${p.id}`, src: `${base}foto-verschillen/${p.id}-a.png` })
  }
  return lijst
}

const AFBEELDINGEN = bouwAfbeeldingenLijst()

type Phase = 'kies-afbeelding' | 'instellen' | 'laden' | 'spelen' | 'klaar'

interface PuzzelState {
  img: HTMLImageElement
  stukjes: Stukje[]
  pieceW: number
  pieceH: number
  margin: number
  rows: number
  cols: number
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function nieuweVolgorde(count: number): number[] {
  let order = shuffle(Array.from({ length: count }, (_, i) => i))
  if (order.every((v, i) => v === i)) {
    ;[order[0], order[1]] = [order[1], order[0]]
  }
  return order
}

export function PuzzelModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('kies-afbeelding')
  const [afbeelding, setAfbeelding] = useState<PuzzelAfbeelding | null>(null)
  const [optie, setOptie] = useState(PUZZEL_OPTIES[0])
  const [vorm, setVorm] = useState<PuzzelVorm>('puzzel')
  const [puzzel, setPuzzel] = useState<PuzzelState | null>(null)
  const [slotOrder, setSlotOrder] = useState<number[]>([])
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

  function bouwPuzzel() {
    if (!afbeelding) return
    setPhase('laden')
    const img = new Image()
    img.onload = () => {
      const { rows, cols } = optie
      const stukjes = bouwStukjes(rows, cols, img.naturalWidth, img.naturalHeight, vorm, Date.now())
      const pieceW = img.naturalWidth / cols
      const pieceH = img.naturalHeight / rows
      const margin = Math.min(pieceW, pieceH) * 0.25 + 4
      setPuzzel({ img, stukjes, pieceW, pieceH, margin, rows, cols })
      setSlotOrder(nieuweVolgorde(rows * cols))
      setSelectedSlot(null)
      setPhase('spelen')
    }
    img.src = afbeelding.src
  }

  useEffect(() => {
    if (!puzzel) return
    slotOrder.forEach((pieceIndex, slot) => {
      const canvas = canvasRefs.current[slot]
      if (!canvas) return
      tekenStukjeOpCanvas(canvas, puzzel.img, puzzel.stukjes[pieceIndex], puzzel.pieceW, puzzel.pieceH, puzzel.margin)
    })
  }, [puzzel, slotOrder])

  useEffect(() => {
    if (phase !== 'spelen' || slotOrder.length === 0) return
    if (slotOrder.every((p, i) => p === i)) {
      recordAnswer(profile, MODULE_ID, true)
      playCorrect()
      setStarTrigger((n) => n + 1)
      setPhase('klaar')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotOrder, phase])

  function tapSlot(slot: number) {
    if (phase !== 'spelen') return
    if (selectedSlot === null) {
      setSelectedSlot(slot)
      return
    }
    if (selectedSlot === slot) {
      setSelectedSlot(null)
      return
    }
    playPop()
    setSlotOrder((prev) => {
      const next = [...prev]
      ;[next[selectedSlot], next[slot]] = [next[slot], next[selectedSlot]]
      return next
    })
    setSelectedSlot(null)
  }

  if (phase === 'kies-afbeelding') {
    return (
      <div className="screen">
        <BackHeader title="Puzzel" onBack={onExit} right={<StarCount profileId={profile.id} />} />
        <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Kies een afbeelding om te puzzelen.</p>
        <div className="card-grid">
          {AFBEELDINGEN.map((a) => (
            <button
              key={a.id}
              className="card"
              onClick={() => {
                setAfbeelding(a)
                setPhase('instellen')
              }}
            >
              <img
                src={a.src}
                alt=""
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12 }}
              />
              <span className="card__label" style={{ fontSize: '0.8rem' }}>
                {a.titel}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'instellen' || phase === 'laden') {
    return (
      <div className="screen">
        <BackHeader title="Puzzel" onBack={() => setPhase('kies-afbeelding')} right={<StarCount profileId={profile.id} />} />
        {afbeelding && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
            <img
              src={afbeelding.src}
              alt=""
              style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 14, boxShadow: 'var(--shadow)' }}
            />
          </div>
        )}

        <div className="form-field">
          <label>Hoeveel stukjes?</label>
          <div className="picker-grid">
            {PUZZEL_OPTIES.map((o) => (
              <BigButton
                key={o.count}
                variant={o.count === optie.count ? 'accent' : 'soft'}
                onClick={() => setOptie(o)}
              >
                {o.label}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Welke vorm?</label>
          <div className="picker-grid">
            {VORM_OPTIES.map((v) => (
              <BigButton
                key={v.id}
                variant={v.id === vorm ? 'accent' : 'soft'}
                onClick={() => setVorm(v.id)}
              >
                {v.icon} {v.label}
              </BigButton>
            ))}
          </div>
        </div>

        <BigButton variant="accent" onClick={bouwPuzzel} disabled={phase === 'laden'}>
          {phase === 'laden' ? '⏳ Even geduld...' : '▶️ Start'}
        </BigButton>
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader
        title="Puzzel"
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton variant="ghost" onClick={() => setPhase('instellen')} aria-label="Instellingen">
              ⚙️
            </BigButton>
          </div>
        }
      />

      {puzzel && (
        <div
          style={{
            width: 'min(92vw, 480px)',
            aspectRatio: `${puzzel.img.naturalWidth} / ${puzzel.img.naturalHeight}`,
            margin: '12px auto',
            display: 'grid',
            gridTemplateColumns: `repeat(${puzzel.cols}, 1fr)`,
            gridTemplateRows: `repeat(${puzzel.rows}, 1fr)`,
            gap: 2,
            background: 'var(--surface)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
            padding: 4,
          }}
        >
          {Array.from({ length: puzzel.rows * puzzel.cols }, (_, slot) => (
            <button
              key={slot}
              onClick={() => tapSlot(slot)}
              data-slot={slot}
              data-piece={slotOrder[slot]}
              style={{
                padding: 0,
                background: 'transparent',
                border: selectedSlot === slot ? '3px solid var(--accent)' : '1px solid transparent',
                borderRadius: 4,
                overflow: 'visible',
                minHeight: 0,
                minWidth: 0,
              }}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[slot] = el
                }}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}

      {phase === 'klaar' && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🧩</span>
          <div>Knap gepuzzeld!</div>
          <BigButton variant="accent" onClick={bouwPuzzel}>
            Nog eens
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
