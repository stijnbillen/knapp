import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { NumericKeypad } from '../../../ui/NumericKeypad'

const MODULE_ID = 'metenwegen'
const MAX_LEVEL = 2

type OefenType = 'meten' | 'wegen' | 'mix'

const TYPES: { id: OefenType; label: string }[] = [
  { id: 'meten', label: '📏 Meten' },
  { id: 'wegen', label: '⚖️ Wegen' },
  { id: 'mix', label: '🔀 Mix' },
]

interface Round {
  soort: 'meten' | 'wegen'
  waarde: number
  max: number
  eenheid: string
  majorEvery: number
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function newRound(level: number, type: OefenType, roundNumber: number): Round {
  const soort: 'meten' | 'wegen' = type === 'mix' ? (roundNumber % 2 === 0 ? 'meten' : 'wegen') : type

  if (soort === 'meten') {
    if (level === 1) return { soort, waarde: randomInt(1, 30), max: 30, eenheid: 'cm', majorEvery: 5 }
    return { soort, waarde: randomInt(1, 100), max: 100, eenheid: 'mm', majorEvery: 10 }
  }

  if (level === 1) {
    return { soort, waarde: randomInt(1, 10) * 100, max: 1000, eenheid: 'g', majorEvery: 100 }
  }
  return { soort, waarde: randomInt(1, 100) * 10, max: 1000, eenheid: 'g', majorEvery: 100 }
}

/** Horizontale liniaal met een balk die de te lezen lengte toont. */
function Ruler({ max, waarde, majorEvery }: { max: number; waarde: number; majorEvery: number }) {
  const width = 300
  const left = 10
  const scale = width / max
  const x = (v: number) => left + v * scale

  return (
    <svg viewBox="0 0 320 100" style={{ width: 'min(90vw, 340px)', margin: '0 auto', display: 'block' }}>
      <rect x={left} y="20" width={x(waarde) - left} height="18" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
      <line x1={left} y1="50" x2={x(max)} y2="50" stroke="#7a6f5d" strokeWidth="3" />
      {Array.from({ length: max + 1 }, (_, i) => i).map((i) => {
        const isMajor = i % majorEvery === 0
        return (
          <line
            key={i}
            x1={x(i)}
            y1="50"
            x2={x(i)}
            y2={isMajor ? 34 : 42}
            stroke="#7a6f5d"
            strokeWidth={isMajor ? 2 : 1}
          />
        )
      })}
      {Array.from({ length: Math.floor(max / majorEvery) + 1 }, (_, i) => i * majorEvery).map((v) => (
        <text key={v} x={x(v)} y="68" textAnchor="middle" fontSize="11" fill="var(--text)">
          {v}
        </text>
      ))}
    </svg>
  )
}

/** Ronde wijzerschaal (zoals een keukenweegschaal) van 0 tot max gram. */
function WeightDial({ max, waarde, majorEvery }: { max: number; waarde: number; majorEvery: number }) {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const point = (deg: number, r: number) => ({
    x: 100 + Math.cos(rad(deg)) * r,
    y: 100 + Math.sin(rad(deg)) * r,
  })
  const valueToDeg = (v: number) => -120 + (v / max) * 240
  const needleEnd = point(valueToDeg(waarde), 68)
  const minorStep = majorEvery / 5

  return (
    <svg viewBox="0 0 200 190" style={{ width: 'min(60vw, 240px)', margin: '0 auto', display: 'block' }}>
      <circle cx="100" cy="100" r="90" fill="var(--surface)" stroke="#7a6f5d" strokeWidth="4" />
      {Array.from({ length: Math.floor(max / minorStep) + 1 }, (_, i) => i * minorStep).map((v) => {
        const isMajor = v % majorEvery === 0
        const deg = valueToDeg(v)
        const outer = point(deg, 84)
        const inner = point(deg, isMajor ? 70 : 76)
        return (
          <line
            key={v}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="#7a6f5d"
            strokeWidth={isMajor ? 3 : 1}
          />
        )
      })}
      {Array.from({ length: Math.floor(max / majorEvery) + 1 }, (_, i) => i * majorEvery).map((v) => {
        const p = point(valueToDeg(v), 58)
        return (
          <text key={v} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill="var(--text)">
            {v}
          </text>
        )
      })}
      <line x1="100" y1="100" x2={needleEnd.x} y2={needleEnd.y} stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill="var(--text)" />
    </svg>
  )
}

export function MetenWegenModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<'instellen' | 'oefenen'>('instellen')
  const [type, setType] = useState<OefenType>('meten')
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [roundNumber, setRoundNumber] = useState(0)
  const [round, setRound] = useState<Round>(() => newRound(1, 'meten', 0))
  const [buffer, setBuffer] = useState('')
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function start() {
    setRound(newRound(level, type, 0))
    setRoundNumber(0)
    setBuffer('')
    setFeedback(null)
    setPhase('oefenen')
  }

  function pressDigit(d: string) {
    if (feedback) return
    setBuffer((b) => (b.length < 4 ? b + d : b))
  }

  function backspace() {
    if (feedback) return
    setBuffer((b) => b.slice(0, -1))
  }

  function confirm() {
    if (feedback || buffer.length === 0) return
    const isCorrect = parseInt(buffer, 10) === round.waarde
    const progress = recordAnswer(profile, MODULE_ID, isCorrect, { maxLevel: MAX_LEVEL, streakToLevelUp: 5 })
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
      setLevel(progress.level)
      setFeedback('good')
    } else {
      playWrong()
      setFeedback('bad')
    }
  }

  function next() {
    const n = roundNumber + 1
    setRoundNumber(n)
    setRound(newRound(level, type, n))
    setBuffer('')
    setFeedback(null)
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader title="Meten & Wegen" onBack={onExit} />

        <div className="form-field">
          <label>Wat wil je oefenen?</label>
          <div className="picker-grid">
            {TYPES.map((t) => (
              <BigButton key={t.id} variant={t.id === type ? 'accent' : 'soft'} onClick={() => setType(t.id)}>
                {t.label}
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

  const vraagLabel = round.soort === 'meten' ? `Hoeveel ${round.eenheid}?` : 'Hoeveel gram?'

  return (
    <div className="screen">
      <BackHeader
        title="Meten & Wegen"
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

      <p style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0 12px', fontSize: '1.1rem' }}>
        {round.soort === 'meten' ? '📏' : '⚖️'} {vraagLabel}
      </p>

      {round.soort === 'meten' ? (
        <Ruler max={round.max} waarde={round.waarde} majorEvery={round.majorEvery} />
      ) : (
        <WeightDial max={round.max} waarde={round.waarde} majorEvery={round.majorEvery} />
      )}

      {!feedback && (
        <>
          <p style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 700, margin: '16px 0 4px' }}>
            {buffer || '▢'} {round.soort === 'meten' ? round.eenheid : 'g'}
          </p>
          <NumericKeypad buffer={buffer} onDigit={pressDigit} onBackspace={backspace} onConfirm={confirm} />
        </>
      )}

      {feedback === 'good' && (
        <FeedbackPanel type="good" message="Juist! 🎉" actionLabel="Volgende" onAction={next} />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message={`Nog niet juist. Het juiste antwoord was ${round.waarde} ${round.soort === 'meten' ? round.eenheid : 'g'}.`}
          actionLabel="Volgende"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
