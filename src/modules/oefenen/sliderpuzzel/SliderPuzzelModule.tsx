import { useState } from 'react'
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

const MODULE_ID = 'sliderpuzzel'
const base = import.meta.env.BASE_URL

interface Afbeelding {
  id: string
  titel: string
  src: string
}

function bouwAfbeeldingenLijst(): Afbeelding[] {
  const lijst: Afbeelding[] = []
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

interface SliderOptie {
  count: number
  rows: number
  cols: number
}

const SLIDER_OPTIES: SliderOptie[] = [
  { count: 6, rows: 2, cols: 3 },
  { count: 8, rows: 2, cols: 4 },
  { count: 9, rows: 3, cols: 3 },
  { count: 12, rows: 3, cols: 4 },
  { count: 16, rows: 4, cols: 4 },
  { count: 20, rows: 4, cols: 5 },
  { count: 25, rows: 5, cols: 5 },
]

type Phase = 'kies-afbeelding' | 'instellen' | 'spelen' | 'klaar'

type Bord = (number | null)[]

function nieuwBord(rows: number, cols: number): Bord {
  const n = rows * cols
  const bord: Bord = Array.from({ length: n }, (_, i) => (i === n - 1 ? null : i))
  let empty = n - 1
  const stappen = 150 + n * 10
  for (let s = 0; s < stappen; s++) {
    const er = Math.floor(empty / cols)
    const ec = empty % cols
    const buren: number[] = []
    if (er > 0) buren.push(empty - cols)
    if (er < rows - 1) buren.push(empty + cols)
    if (ec > 0) buren.push(empty - 1)
    if (ec < cols - 1) buren.push(empty + 1)
    const kies = buren[Math.floor(Math.random() * buren.length)]
    bord[empty] = bord[kies]
    bord[kies] = null
    empty = kies
  }
  return bord
}

function isOpgelost(bord: Bord): boolean {
  return bord.every((v, i) => (i === bord.length - 1 ? v === null : v === i))
}

export function SliderPuzzelModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('kies-afbeelding')
  const [afbeelding, setAfbeelding] = useState<Afbeelding | null>(null)
  const [optie, setOptie] = useState(SLIDER_OPTIES[0])
  const [bord, setBord] = useState<Bord>([])
  const [starTrigger, setStarTrigger] = useState(0)

  function start() {
    setBord(nieuwBord(optie.rows, optie.cols))
    setPhase('spelen')
  }

  function tapTegel(pos: number) {
    if (phase !== 'spelen') return
    const { cols } = optie
    const empty = bord.indexOf(null)
    const pr = Math.floor(pos / cols)
    const pc = pos % cols
    const er = Math.floor(empty / cols)
    const ec = empty % cols
    const aangrenzend = (pr === er && Math.abs(pc - ec) === 1) || (pc === ec && Math.abs(pr - er) === 1)
    if (!aangrenzend) return
    playPop()
    const next = [...bord]
    next[empty] = next[pos]
    next[pos] = null
    setBord(next)
    if (isOpgelost(next)) {
      recordAnswer(profile, MODULE_ID, true)
      playCorrect()
      setStarTrigger((n) => n + 1)
      setPhase('klaar')
    }
  }

  if (phase === 'kies-afbeelding') {
    return (
      <div className="screen">
        <BackHeader title="Schuifpuzzel" onBack={onExit} right={<StarCount profileId={profile.id} />} />
        <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Kies een afbeelding om te schuiven.</p>
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
              <img src={a.src} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12 }} />
              <span className="card__label" style={{ fontSize: '0.8rem' }}>
                {a.titel}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader title="Schuifpuzzel" onBack={() => setPhase('kies-afbeelding')} right={<StarCount profileId={profile.id} />} />
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
          <label>Hoeveel stukken?</label>
          <div className="picker-grid">
            {SLIDER_OPTIES.map((o) => (
              <BigButton
                key={o.count}
                variant={o.count === optie.count ? 'accent' : 'soft'}
                onClick={() => setOptie(o)}
              >
                {o.count}
              </BigButton>
            ))}
          </div>
        </div>

        <BigButton variant="accent" onClick={start}>
          ▶️ Start
        </BigButton>
      </div>
    )
  }

  const { rows, cols } = optie

  return (
    <div className="screen">
      <BackHeader
        title="Schuifpuzzel"
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

      {afbeelding && (
        <div
          style={{
            width: 'min(92vw, 480px)',
            aspectRatio: `${cols} / ${rows}`,
            margin: '12px auto',
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: 2,
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
            backgroundImage: `url(${afbeelding.src})`,
            backgroundSize: '100% 100%',
          }}
        >
          {bord.map((stukIndex, pos) => {
            if (stukIndex === null) return <div key={pos} />
            const origRow = Math.floor(stukIndex / cols)
            const origCol = stukIndex % cols
            return (
              <button
                key={pos}
                onClick={() => tapTegel(pos)}
                data-pos={pos}
                data-piece={stukIndex}
                style={{
                  padding: 0,
                  border: 'none',
                  borderRadius: 2,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.15) inset',
                  backgroundImage: `url(${afbeelding.src})`,
                  backgroundSize: `${cols * 100}% ${rows * 100}%`,
                  backgroundPosition: `${cols === 1 ? 0 : (origCol / (cols - 1)) * 100}% ${rows === 1 ? 0 : (origRow / (rows - 1)) * 100}%`,
                }}
              />
            )
          })}
        </div>
      )}

      {phase === 'klaar' && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🧩</span>
          <div>Knap geschoven!</div>
          <BigButton variant="accent" onClick={start}>
            Nog eens
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
