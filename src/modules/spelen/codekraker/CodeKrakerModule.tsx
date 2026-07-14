import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { playClick, playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { StarBurst } from '../../../ui/StarBurst'

const CODE_LENGTH = 4
const MAX_GUESSES = 10

// Zes duidelijk verschillende kleuren; de code zelf bestaat uit vier.
const COLORS = ['🔴', '🟡', '🔵', '🟢', '🟣', '🟠']

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Geheime code zonder dubbele kleuren — overzichtelijk voor een eerste versie. */
function newSecret(): string[] {
  return shuffle(COLORS).slice(0, CODE_LENGTH)
}

interface Feedback {
  goed: number // juiste kleur op de juiste plek
  bijna: number // juiste kleur op een andere plek
}

function judge(secret: string[], guess: string[]): Feedback {
  let goed = 0
  const restSecret: string[] = []
  const restGuess: string[] = []
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === secret[i]) goed++
    else {
      restSecret.push(secret[i])
      restGuess.push(guess[i])
    }
  }
  let bijna = 0
  for (const color of restGuess) {
    const at = restSecret.indexOf(color)
    if (at !== -1) {
      bijna++
      restSecret.splice(at, 1)
    }
  }
  return { goed, bijna }
}

interface GuessRow {
  guess: string[]
  feedback: Feedback
}

export function CodeKrakerModule({ onExit }: ModuleProps) {
  const [secret, setSecret] = useState<string[]>(() => newSecret())
  const [rows, setRows] = useState<GuessRow[]>([])
  const [current, setCurrent] = useState<string[]>([])
  const [result, setResult] = useState<'won' | 'lost' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function addColor(color: string) {
    if (result || current.length >= CODE_LENGTH) return
    playClick()
    setCurrent((c) => [...c, color])
  }

  function removeColor() {
    if (result) return
    setCurrent((c) => c.slice(0, -1))
  }

  function check() {
    if (result || current.length < CODE_LENGTH) return
    const feedback = judge(secret, current)
    const nextRows = [...rows, { guess: current, feedback }]
    setRows(nextRows)
    setCurrent([])
    if (feedback.goed === CODE_LENGTH) {
      playStar()
      setStarTrigger((n) => n + 1)
      setResult('won')
    } else if (nextRows.length >= MAX_GUESSES) {
      playWrong()
      setResult('lost')
    } else {
      playPop()
    }
  }

  function restart() {
    setSecret(newSecret())
    setRows([])
    setCurrent([])
    setResult(null)
  }

  const slotStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--surface)',
    boxShadow: 'var(--shadow)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.6rem',
    lineHeight: 1,
  }

  return (
    <div className="screen">
      <BackHeader
        title="Code Kraker"
        onBack={onExit}
        right={
          <span className="star-count">
            🕵️ {rows.length}/{MAX_GUESSES}
          </span>
        }
      />

      <p style={{ textAlign: 'center', color: 'var(--text-soft)', margin: '0 0 10px' }}>
        Kraak de geheime code van {CODE_LENGTH} kleuren! ✔ = juiste plek, ○ = andere plek.
      </p>

      {/* Eerdere pogingen met feedback */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {row.guess.map((color, j) => (
              <span key={j} style={slotStyle}>
                {color}
              </span>
            ))}
            <span
              aria-label={`${row.feedback.goed} juist, ${row.feedback.bijna} bijna`}
              style={{ minWidth: 90, fontSize: '0.95rem', fontWeight: 700 }}
            >
              {'✔'.repeat(row.feedback.goed)}
              {'○'.repeat(row.feedback.bijna)}
            </span>
          </div>
        ))}
      </div>

      {!result && (
        <>
          {/* Huidige gok */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              margin: '14px 0 10px',
            }}
          >
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <span
                key={i}
                style={{
                  ...slotStyle,
                  outline: i === current.length ? '3px solid var(--accent)' : 'none',
                }}
              >
                {current[i] ?? ''}
              </span>
            ))}
          </div>

          {/* Kleurenpalet */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map((color) => (
              <BigButton
                key={color}
                variant="soft"
                style={{ fontSize: '1.6rem', minWidth: 56, minHeight: 56 }}
                onClick={() => addColor(color)}
                aria-label={`Kleur ${color}`}
              >
                {color}
              </BigButton>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 12 }}>
            <BigButton variant="ghost" onClick={removeColor} disabled={current.length === 0} aria-label="Wissen">
              ⌫
            </BigButton>
            <BigButton
              variant="accent"
              style={{ minWidth: 160 }}
              onClick={check}
              disabled={current.length < CODE_LENGTH}
            >
              ✔ Controleer
            </BigButton>
          </div>
        </>
      )}

      {result === 'won' && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🕵️🎉</span>
          <div>
            Code gekraakt in <strong>{rows.length}</strong> {rows.length === 1 ? 'poging' : 'pogingen'}!
          </div>
          <BigButton variant="accent" onClick={restart}>
            Nieuwe code
          </BigButton>
        </div>
      )}

      {result === 'lost' && (
        <div className="feedback-panel feedback-panel--bad">
          <span className="feedback-panel__emoji">🙈</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span>De code was:</span>
            {secret.map((color, i) => (
              <span key={i} style={slotStyle}>
                {color}
              </span>
            ))}
          </div>
          <BigButton variant="accent" onClick={restart}>
            Nog eens proberen
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
