import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playClick, playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { NumericKeypad } from '../../../ui/NumericKeypad'

const MODULE_ID = 'getallenlijn'
const MAX_LEVEL = 3

type Modus = 'lezen' | 'zetten' | 'mix'

const MODI: { id: Modus; label: string }[] = [
  { id: 'lezen', label: '👀 Lezen' },
  { id: 'zetten', label: '👉 Aanwijzen' },
  { id: 'mix', label: '🔀 Mix' },
]

interface LevelConf {
  max: number
  step: number
  majorEvery: number
}

const LEVELS: LevelConf[] = [
  { max: 20, step: 1, majorEvery: 5 },
  { max: 100, step: 10, majorEvery: 10 },
  { max: 1000, step: 100, majorEvery: 100 },
]

interface Round {
  modus: 'lezen' | 'zetten'
  waarde: number
  levelConf: LevelConf
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function newRound(level: number, modeChoice: Modus, roundNumber: number): Round {
  const modus: 'lezen' | 'zetten' = modeChoice === 'mix' ? (roundNumber % 2 === 0 ? 'lezen' : 'zetten') : modeChoice
  const levelConf = LEVELS[level - 1]
  const ticks = levelConf.max / levelConf.step
  const waarde = randomInt(0, ticks) * levelConf.step
  return { modus, waarde, levelConf }
}

/** Getallenlijn met streepjes; toont optioneel een pijltje bij een waarde, en/of aanklikbare punten. */
function NumberLine({
  levelConf,
  marker,
  clickable,
  onPick,
}: {
  levelConf: LevelConf
  marker?: number
  clickable?: boolean
  onPick?: (v: number) => void
}) {
  const width = 300
  const left = 10
  const scale = width / levelConf.max
  const x = (v: number) => left + v * scale
  const waarden: number[] = []
  for (let v = 0; v <= levelConf.max; v += levelConf.step) waarden.push(v)

  return (
    <svg viewBox="0 0 320 110" style={{ width: 'min(90vw, 340px)', margin: '0 auto', display: 'block' }}>
      <line x1={left} y1="55" x2={x(levelConf.max)} y2="55" stroke="#7a6f5d" strokeWidth="3" />
      {waarden.map((v) => {
        const isMajor = v % levelConf.majorEvery === 0
        return (
          <g key={v}>
            <line x1={x(v)} y1="55" x2={x(v)} y2={isMajor ? 39 : 47} stroke="#7a6f5d" strokeWidth={isMajor ? 2 : 1} />
            {isMajor && (
              <text x={x(v)} y="73" textAnchor="middle" fontSize="11" fill="var(--text)">
                {v}
              </text>
            )}
            {clickable && (
              <circle
                cx={x(v)}
                cy="55"
                r="11"
                fill="transparent"
                stroke="none"
                style={{ cursor: 'pointer' }}
                onClick={() => onPick?.(v)}
              />
            )}
          </g>
        )
      })}
      {marker !== undefined && (
        <polygon
          points={`${x(marker) - 7},20 ${x(marker) + 7},20 ${x(marker)},36`}
          fill="var(--accent)"
        />
      )}
    </svg>
  )
}

export function GetallenlijnModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<'instellen' | 'oefenen'>('instellen')
  const [modeChoice, setModeChoice] = useState<Modus>('lezen')
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [roundNumber, setRoundNumber] = useState(0)
  const [round, setRound] = useState<Round>(() => newRound(1, 'lezen', 0))
  const [buffer, setBuffer] = useState('')
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function start() {
    setRound(newRound(level, modeChoice, 0))
    setRoundNumber(0)
    setBuffer('')
    setFeedback(null)
    setPhase('oefenen')
  }

  function handleResult(isCorrect: boolean) {
    const progress = recordAnswer(profile.id, MODULE_ID, isCorrect, { maxLevel: MAX_LEVEL, streakToLevelUp: 5 })
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

  function pressDigit(d: string) {
    if (feedback) return
    playClick()
    setBuffer((b) => (b.length < 4 ? b + d : b))
  }

  function backspace() {
    if (feedback) return
    setBuffer((b) => b.slice(0, -1))
  }

  function confirmLezen() {
    if (feedback || buffer.length === 0) return
    handleResult(parseInt(buffer, 10) === round.waarde)
  }

  function kiesTick(v: number) {
    if (feedback || round.modus !== 'zetten') return
    handleResult(v === round.waarde)
  }

  function next() {
    const n = roundNumber + 1
    setRoundNumber(n)
    setRound(newRound(level, modeChoice, n))
    setBuffer('')
    setFeedback(null)
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader title="Getallenlijn" onBack={onExit} />

        <div className="form-field">
          <label>Wat wil je oefenen?</label>
          <div className="picker-grid">
            {MODI.map((m) => (
              <BigButton key={m.id} variant={m.id === modeChoice ? 'accent' : 'soft'} onClick={() => setModeChoice(m.id)}>
                {m.label}
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

  return (
    <div className="screen">
      <BackHeader
        title="Getallenlijn"
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
        {round.modus === 'lezen' ? '👀 Welk getal wordt aangeduid?' : `👉 Tik op ${round.waarde}`}
      </p>

      <NumberLine
        levelConf={round.levelConf}
        marker={round.modus === 'lezen' ? round.waarde : undefined}
        clickable={round.modus === 'zetten' && !feedback}
        onPick={kiesTick}
      />

      {!feedback && round.modus === 'lezen' && (
        <>
          <p style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 700, margin: '16px 0 4px' }}>
            {buffer || '▢'}
          </p>
          <NumericKeypad buffer={buffer} onDigit={pressDigit} onBackspace={backspace} onConfirm={confirmLezen} />
        </>
      )}

      {feedback === 'good' && (
        <FeedbackPanel type="good" message="Juist! 🎉" actionLabel="Volgende" onAction={next} />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message={`Nog niet juist. Het juiste antwoord was ${round.waarde}.`}
          actionLabel="Volgende"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
