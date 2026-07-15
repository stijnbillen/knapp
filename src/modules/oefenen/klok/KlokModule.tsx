import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playClick, playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'

const MODULE_ID = 'klok'
const MAX_LEVEL = 3

const HOURS = ['twaalf', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf']

function hourWord(h: number): string {
  return HOURS[h % 12]
}

/** Tijd in woorden, zoals je de klok leest (vijf voor half vier, kwart over drie…). */
function timeToWords(h: number, m: number): string {
  const next = h + 1
  if (m === 0) return `${hourWord(h)} uur`
  if (m === 15) return `kwart over ${hourWord(h)}`
  if (m === 30) return `half ${hourWord(next)}`
  if (m === 45) return `kwart voor ${hourWord(next)}`
  if (m < 15) return `${m === 5 ? 'vijf' : 'tien'} over ${hourWord(h)}`
  if (m < 30) return `${m === 20 ? 'tien' : 'vijf'} voor half ${hourWord(next)}`
  if (m < 45) return `${m === 35 ? 'vijf' : 'tien'} over half ${hourWord(next)}`
  return `${m === 50 ? 'tien' : 'vijf'} voor ${hourWord(next)}`
}

/** Minuten die per niveau voorkomen. */
function minutesForLevel(level: number): number[] {
  if (level === 1) return [0, 30]
  if (level === 2) return [0, 15, 30, 45]
  return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Round {
  mode: 'lezen' | 'zetten'
  hour: number // 1..12
  minute: number
  options: string[] // enkel bij 'lezen': tijden in woorden
  answer: string
}

function newRound(level: number, roundNumber: number): Round {
  const minutes = minutesForLevel(level)
  const hour = randomInt(1, 12)
  const minute = minutes[randomInt(0, minutes.length - 1)]
  const answer = timeToWords(hour, minute)
  const mode = roundNumber % 2 === 0 ? 'lezen' : 'zetten'

  if (mode === 'zetten') {
    return { mode, hour, minute, options: [], answer }
  }

  // Drie foute opties uit dezelfde minutenpool (uniek in woorden)
  const options = new Set<string>([answer])
  while (options.size < 4) {
    const dh = randomInt(1, 12)
    const dm = minutes[randomInt(0, minutes.length - 1)]
    options.add(timeToWords(dh, dm))
  }
  return { mode, hour, minute, options: shuffle([...options]), answer }
}

/** Analoge klok als SVG; de uurwijzer schuift mee met de minuten. */
function ClockFace({ hour, minute }: { hour: number; minute: number }) {
  const hourAngle = ((hour % 12) + minute / 60) * 30
  const minuteAngle = minute * 6
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const point = (deg: number, r: number) => ({
    x: 100 + Math.cos(rad(deg)) * r,
    y: 100 + Math.sin(rad(deg)) * r,
  })
  const hourEnd = point(hourAngle, 45)
  const minuteEnd = point(minuteAngle, 65)

  return (
    <svg viewBox="0 0 200 200" style={{ width: 'min(60vw, 240px)', margin: '0 auto', display: 'block' }}>
      <circle cx="100" cy="100" r="95" fill="var(--surface)" stroke="#7a6f5d" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => {
        const isHour = i % 5 === 0
        const outer = point(i * 6, 92)
        const inner = point(i * 6, isHour ? 84 : 88)
        return (
          <line
            key={i}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="#7a6f5d"
            strokeWidth={isHour ? 3 : 1}
          />
        )
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1
        const p = point(n * 30, 72)
        return (
          <text
            key={n}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="16"
            fontWeight="700"
            fill="var(--text)"
          >
            {n}
          </text>
        )
      })}
      <line x1="100" y1="100" x2={hourEnd.x} y2={hourEnd.y} stroke="var(--text)" strokeWidth="7" strokeLinecap="round" />
      <line x1="100" y1="100" x2={minuteEnd.x} y2={minuteEnd.y} stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill="var(--text)" />
    </svg>
  )
}

/** Knoppenpaar om een waarde te verhogen/verlagen. */
function Stepper({
  label,
  onDown,
  onUp,
}: {
  label: string
  onDown: () => void
  onUp: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <BigButton variant="soft" onClick={onDown} aria-label={`${label} terug`}>
        −
      </BigButton>
      <span style={{ minWidth: 84, textAlign: 'center', fontWeight: 700 }}>{label}</span>
      <BigButton variant="soft" onClick={onUp} aria-label={`${label} vooruit`}>
        +
      </BigButton>
    </div>
  )
}

export function KlokModule({ profile, onExit }: ModuleProps) {
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [roundNumber, setRoundNumber] = useState(0)
  const [round, setRound] = useState(() => newRound(level, 0))
  const [setHour, setSetHour] = useState(12)
  const [setMinute, setSetMinute] = useState(0)
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function handleResult(isCorrect: boolean) {
    const progress = recordAnswer(profile, MODULE_ID, isCorrect, {
      maxLevel: MAX_LEVEL,
      streakToLevelUp: 4,
    })
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

  function chooseOption(value: string) {
    if (feedback) return
    handleResult(value === round.answer)
  }

  function checkHands() {
    if (feedback) return
    handleResult(setHour % 12 === round.hour % 12 && setMinute === round.minute)
  }

  function adjust(part: 'hour' | 'minute', delta: number) {
    playClick()
    if (part === 'hour') setSetHour((h) => ((h - 1 + delta + 12) % 12) + 1)
    else setSetMinute((m) => (m + delta + 60) % 60)
  }

  function next() {
    if (feedback === 'good') {
      const n = roundNumber + 1
      setRoundNumber(n)
      setRound(newRound(level, n))
      setSetHour(12)
      setSetMinute(0)
    }
    setFeedback(null)
  }

  const isLezen = round.mode === 'lezen'

  return (
    <div className="screen">
      <BackHeader title="Klok" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <p style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0 12px', fontSize: '1.15rem' }}>
        {isLezen ? '🕒 Hoe laat is het?' : (
          <span>
            🕒 Zet de klok op: <span style={{ color: 'var(--accent)' }}>{round.answer}</span>
          </span>
        )}
      </p>

      <ClockFace
        hour={isLezen ? round.hour : setHour}
        minute={isLezen ? round.minute : setMinute}
      />

      {!feedback && isLezen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          {round.options.map((option) => (
            <BigButton
              key={option}
              variant="soft"
              style={{ minWidth: 260 }}
              onClick={() => chooseOption(option)}
            >
              {option}
            </BigButton>
          ))}
        </div>
      )}

      {!feedback && !isLezen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <Stepper label="uur" onDown={() => adjust('hour', -1)} onUp={() => adjust('hour', 1)} />
          <Stepper
            label="minuten"
            onDown={() => adjust('minute', -5)}
            onUp={() => adjust('minute', 5)}
          />
          <BigButton variant="accent" style={{ minWidth: 200 }} onClick={checkHands}>
            ✔ Controleer
          </BigButton>
        </div>
      )}

      {feedback === 'good' && (
        <FeedbackPanel
          type="good"
          message={isLezen ? 'Juist gelezen! 🎉' : 'De klok staat perfect! 🎉'}
          actionLabel="Volgende"
          onAction={next}
        />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message={
            isLezen
              ? 'Kijk nog eens goed: de korte wijzer toont het uur, de lange de minuten.'
              : 'Nog niet juist. Denk eraan: de korte wijzer is het uur, de lange de minuten.'
          }
          actionLabel="Probeer opnieuw"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
