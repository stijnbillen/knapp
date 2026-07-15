import { useEffect, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playPop, playWrong } from '../../../core/audio'
import { speak } from '../../../core/speech'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'

const MODULE_ID = 'icoonpatroon'

const POOL = [
  '🍎', '🍌', '🍒', '🍉', '🐶', '🐱', '🐹', '🦁', '⭐', '🌙',
  '☀️', '🌈', '⚽', '🚗', '✈️', '🚲', '🎈', '🎁', '🧩', '🐢',
]

type Shape = 'rij' | 'kolom' | 'vierkant' | 'cirkel'
const SHAPES: Shape[] = ['rij', 'kolom', 'vierkant', 'cirkel']

type Phase = 'instellen' | 'onthouden' | 'verstopt' | 'opbouwen' | 'klaar'

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function slotPositions(shape: Shape, count: number): { left: number; top: number }[] {
  const positions: { left: number; top: number }[] = []
  if (shape === 'rij') {
    for (let i = 0; i < count; i++) positions.push({ left: ((i + 0.5) / count) * 100, top: 50 })
  } else if (shape === 'kolom') {
    for (let i = 0; i < count; i++) positions.push({ left: 50, top: ((i + 0.5) / count) * 100 })
  } else if (shape === 'vierkant') {
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols)
      const c = i % cols
      positions.push({ left: ((c + 0.5) / cols) * 100, top: ((r + 0.5) / rows) * 100 })
    }
  } else {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2
      positions.push({ left: 50 + 38 * Math.cos(angle), top: 50 + 38 * Math.sin(angle) })
    }
  }
  return positions
}

function slotSize(shape: Shape, count: number): number {
  if (shape === 'vierkant') {
    const cols = Math.ceil(Math.sqrt(count))
    return Math.max(36, Math.min(64, Math.floor(300 / cols) - 10))
  }
  if (shape === 'cirkel') return count > 6 ? 48 : 56
  return Math.max(30, Math.min(64, Math.floor(300 / count) - 8))
}

interface Round {
  shape: Shape
  pattern: string[]
  palette: string[]
}

function newRound(count: number, poolSize: number, allowRepeats: boolean): Round {
  const shape = SHAPES[randomInt(SHAPES.length)]
  const poolIcons = shuffle(POOL).slice(0, poolSize)
  const effectiveCount = allowRepeats ? count : Math.min(count, poolIcons.length)
  const pattern = allowRepeats
    ? Array.from({ length: effectiveCount }, () => poolIcons[randomInt(poolIcons.length)])
    : shuffle(poolIcons).slice(0, effectiveCount)
  return { shape, pattern, palette: shuffle(poolIcons) }
}

export function IcoonPatroonModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('instellen')
  const [count, setCount] = useState(4)
  const [poolSize, setPoolSize] = useState(10)
  const [allowRepeats, setAllowRepeats] = useState(false)
  const [round, setRound] = useState<Round | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [misses, setMisses] = useState(0)
  const [shake, setShake] = useState(0)
  const [starTrigger, setStarTrigger] = useState(0)

  function start() {
    const r = newRound(count, poolSize, allowRepeats)
    setRound(r)
    setActiveIndex(0)
    setMisses(0)
    setPhase('onthouden')
  }

  useEffect(() => {
    if (phase !== 'verstopt') return
    const timer = setTimeout(() => setPhase('opbouwen'), 900)
    return () => clearTimeout(timer)
  }, [phase])

  function finish(missCount: number) {
    recordAnswer(profile, MODULE_ID, missCount === 0)
    playCorrect()
    if (missCount === 0) setStarTrigger((n) => n + 1)
    setPhase('klaar')
  }

  function chooseIcon(icon: string) {
    if (!round || phase !== 'opbouwen') return
    if (icon === round.pattern[activeIndex]) {
      playPop()
      const next = activeIndex + 1
      if (next >= round.pattern.length) {
        finish(misses)
      } else {
        setActiveIndex(next)
      }
    } else {
      playWrong()
      setMisses((m) => m + 1)
      setShake((n) => n + 1)
    }
  }

  function patternGrid(showAll: boolean) {
    if (!round) return null
    const positions = slotPositions(round.shape, round.pattern.length)
    const size = slotSize(round.shape, round.pattern.length)
    return (
      <div
        key={shake}
        className={shake > 0 ? 'shake' : ''}
        style={{
          position: 'relative',
          width: 'min(90vw, 320px)',
          height: 'min(90vw, 320px)',
          margin: '16px auto',
        }}
      >
        {positions.map((pos, i) => {
          const isActive = !showAll && phase === 'opbouwen' && i === activeIndex
          const isFilled = !showAll && i < activeIndex
          const emoji = showAll ? round.pattern[i] : isFilled ? round.pattern[i] : '❓'
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                transform: 'translate(-50%, -50%)',
                width: size,
                height: size,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size * 0.55,
                lineHeight: 1,
                background: isFilled ? 'var(--good-soft)' : 'var(--surface)',
                boxShadow: 'var(--shadow)',
                outline: isActive
                  ? '3px solid var(--accent)'
                  : isFilled
                    ? '3px solid var(--good)'
                    : 'none',
                outlineOffset: -3,
              }}
            >
              {emoji}
            </div>
          )
        })}
      </div>
    )
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader
          title="Icoontjes in een patroon"
          onBack={onExit}
          right={<StarCount profileId={profile.id} />}
        />

        <div className="form-field">
          <label>Hoeveel icoontjes in het patroon?</label>
          <div className="picker-grid">
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <BigButton key={n} variant={n === count ? 'accent' : 'soft'} onClick={() => setCount(n)}>
                {n}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Uit hoeveel icoontjes kan je kiezen?</label>
          <div className="picker-grid">
            {[4, 6, 8, 10, 12, 15].map((n) => (
              <BigButton
                key={n}
                variant={n === poolSize ? 'accent' : 'soft'}
                onClick={() => setPoolSize(n)}
              >
                {n}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <button className="toggle-row" onClick={() => setAllowRepeats((v) => !v)}>
            <span>Icoontjes mogen herhalen</span>
            <span className={`switch ${allowRepeats ? 'switch--on' : ''}`} />
          </button>
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
        title="Icoontjes in een patroon"
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

      {phase === 'onthouden' && round && (
        <>
          <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', margin: '8px 0' }}>
            👀 Kijk goed en onthoud het patroon!
          </p>
          {patternGrid(true)}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BigButton
              variant="accent"
              style={{ minWidth: 220 }}
              onClick={() => {
                speak('Oogjes dicht!')
                setPhase('verstopt')
              }}
            >
              ✔ Ik heb het onthouden!
            </BigButton>
          </div>
        </>
      )}

      {phase === 'verstopt' && (
        <p style={{ textAlign: 'center', fontSize: '5rem', margin: '80px 0' }}>🙈</p>
      )}

      {(phase === 'opbouwen' || phase === 'klaar') && round && (
        <>
          <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', margin: '8px 0' }}>
            {phase === 'klaar'
              ? misses === 0
                ? '🎉 Foutloos, super!'
                : '🎉 Gelukt!'
              : '🧠 Bouw het patroon opnieuw op!'}
          </p>
          {patternGrid(phase === 'klaar')}

          {phase === 'opbouwen' && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, maxWidth: 420, margin: '0 auto' }}>
              {round.palette.map((icon, i) => (
                <BigButton
                  key={i}
                  variant="soft"
                  style={{ fontSize: '2rem', minWidth: 60, minHeight: 60 }}
                  onClick={() => chooseIcon(icon)}
                >
                  {icon}
                </BigButton>
              ))}
            </div>
          )}

          {phase === 'klaar' && (
            <div className="feedback-panel feedback-panel--good">
              <span className="feedback-panel__emoji">🧠</span>
              <div>
                {misses === 0
                  ? 'Jij hebt een fantastisch geheugen!'
                  : 'Goed gedaan! Volgende keer nog beter onthouden.'}
              </div>
              <BigButton variant="accent" onClick={start}>
                Nog eens proberen
              </BigButton>
            </div>
          )}
        </>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
