import { useEffect, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playTone, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'

const MODULE_ID = 'kleurenvolgorde'

interface ColorDef {
  label: string
  bg: string
  freq: number
}

// Oplopende toonladder zodat elke kleur ook een eigen, herkenbaar geluidje heeft.
const COLORS: ColorDef[] = [
  { label: 'rood', bg: '#e63946', freq: 261.63 },
  { label: 'blauw', bg: '#1d4ed8', freq: 293.66 },
  { label: 'geel', bg: '#ffd60a', freq: 329.63 },
  { label: 'groen', bg: '#2a9d34', freq: 349.23 },
  { label: 'oranje', bg: '#f77f00', freq: 392.0 },
  { label: 'paars', bg: '#7b2cbf', freq: 440.0 },
  { label: 'roze', bg: '#ff5da2', freq: 493.88 },
  { label: 'turquoise', bg: '#00b4d8', freq: 523.25 },
  { label: 'bruin', bg: '#8a5a2c', freq: 587.33 },
  { label: 'zwart', bg: '#22223b', freq: 659.25 },
]

const SPEEDS = [
  { label: '🐢 Rustig', ms: 1500 },
  { label: '🙂 Normaal', ms: 1000 },
  { label: '⚡ Snel', ms: 700 },
  { label: '🚀 Heel snel', ms: 500 },
]

type Phase = 'instellen' | 'tonen' | 'invoer' | 'klaar'

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Positioneert de kleurtjes als een cirkeltje binnen een vierkant vlak.
function ringPosition(index: number, count: number, radius: number): { left: number; top: number } {
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2
  return {
    left: 50 + (radius / 2) * Math.cos(angle),
    top: 50 + (radius / 2) * Math.sin(angle),
  }
}

export function KleurenVolgordeModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('instellen')
  const [count, setCount] = useState(4)
  const [speed, setSpeed] = useState(1000)
  const [sequence, setSequence] = useState<number[]>([])
  const [inputIndex, setInputIndex] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [reached, setReached] = useState(0)
  const [shake, setShake] = useState(0)
  const [starTrigger, setStarTrigger] = useState(0)

  function start() {
    setSequence([randomInt(count)])
    setInputIndex(0)
    setReached(0)
    setPhase('tonen')
  }

  // Speelt de huidige reeks af: elke kleur licht kort op met een pauze erna,
  // zodat twee keer dezelfde kleur na elkaar ook echt als twee flitsen te zien is.
  useEffect(() => {
    if (phase !== 'tonen') return
    let cancelled = false
    ;(async () => {
      for (const colorIdx of sequence) {
        if (cancelled) return
        setActiveIndex(colorIdx)
        playTone(COLORS[colorIdx].freq)
        await sleep(speed * 0.6)
        if (cancelled) return
        setActiveIndex(-1)
        await sleep(speed * 0.4)
      }
      if (!cancelled) {
        setInputIndex(0)
        setPhase('invoer')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phase, sequence, speed])

  function finish(finalReached: number) {
    recordAnswer(profile.id, MODULE_ID, finalReached >= count)
    if (finalReached >= count) {
      playCorrect()
      setStarTrigger((n) => n + 1)
    }
    setReached(finalReached)
    setPhase('klaar')
  }

  function tapColor(idx: number) {
    if (phase !== 'invoer') return
    setActiveIndex(idx)
    playTone(COLORS[idx].freq, 0.15)
    setTimeout(() => setActiveIndex(-1), 150)

    if (sequence[inputIndex] === idx) {
      const next = inputIndex + 1
      if (next >= sequence.length) {
        const completedLength = sequence.length
        setTimeout(() => {
          setSequence((seq) => [...seq, randomInt(count)])
          setPhase('tonen')
        }, 700)
        setReached(completedLength)
      } else {
        setInputIndex(next)
      }
    } else {
      playWrong()
      setShake((n) => n + 1)
      finish(sequence.length - 1)
    }
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader
          title="Kleuren in volgorde"
          onBack={onExit}
          right={<StarCount profileId={profile.id} />}
        />

        <div className="form-field">
          <label>Hoeveel kleuren?</label>
          <div className="picker-grid">
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <BigButton key={n} variant={n === count ? 'accent' : 'soft'} onClick={() => setCount(n)}>
                {n}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Hoe snel flikkeren ze?</label>
          <div className="picker-grid">
            {SPEEDS.map((s) => (
              <BigButton
                key={s.ms}
                variant={s.ms === speed ? 'accent' : 'soft'}
                onClick={() => setSpeed(s.ms)}
              >
                {s.label}
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

  const activeColors = COLORS.slice(0, count)

  return (
    <div className="screen">
      <BackHeader
        title="Kleuren in volgorde"
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

      <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', margin: '8px 0' }}>
        {phase === 'tonen' && '👀 Kijk en luister goed!'}
        {phase === 'invoer' && '👉 Nu jij! Tik dezelfde volgorde.'}
        {phase === 'klaar' &&
          (reached >= count ? '🎉 Foutloos tot het einde!' : `🎉 Je onthield ${reached} op rij!`)}
      </p>

      <div
        key={shake}
        className={shake > 0 && phase === 'klaar' ? 'shake' : ''}
        style={{
          position: 'relative',
          width: 'min(90vw, 340px)',
          height: 'min(90vw, 340px)',
          margin: '16px auto',
        }}
      >
        {activeColors.map((color, idx) => {
          const pos = ringPosition(idx, count, 88)
          const isActive = activeIndex === idx
          return (
            <button
              key={idx}
              aria-label={color.label}
              disabled={phase !== 'invoer'}
              onClick={() => tapColor(idx)}
              style={{
                position: 'absolute',
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                transform: `translate(-50%, -50%) scale(${isActive ? 1.25 : 1})`,
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: color.bg,
                boxShadow: isActive ? `0 0 0 6px ${color.bg}55, var(--shadow)` : 'var(--shadow)',
                border: 'none',
                opacity: isActive ? 1 : 0.85,
                transition: 'transform 0.1s ease, box-shadow 0.1s ease, opacity 0.1s ease',
              }}
            />
          )
        })}
      </div>

      {phase === 'klaar' && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🌈</span>
          <div>
            {reached >= count
              ? 'Knap onthouden, jij hebt een topgeheugen!'
              : 'Goed geprobeerd! Volgende keer nog verder komen.'}
          </div>
          <BigButton variant="accent" onClick={start}>
            Nog eens proberen
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
