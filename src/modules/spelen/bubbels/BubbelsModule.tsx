import { useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playPop, playStar } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'

const GAME_ID = 'bubbels'
const ROUND_SECONDS = 60

interface Bubble {
  id: number
  x: number // 0..1 (fractie van de breedte)
  y: number // 0..1, 1 = onderaan, 0 = bovenaan
  size: number // px
  speed: number // fractie per seconde
  hue: number
  popped: boolean
}

type Phase = 'start' | 'playing' | 'done'

export function BubbelsModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [isRecord, setIsRecord] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const nextId = useRef(1)
  const spawnTimer = useRef(0)
  const scoreRef = useRef(0)

  useEffect(() => {
    if (phase !== 'playing') return

    let last = performance.now()
    let elapsed = 0
    let raf = 0

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      elapsed += dt
      setTimeLeft(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)))

      // Tempo stijgt: spawninterval zakt van 1s naar 0,35s
      const spawnInterval = Math.max(0.35, 1 - (elapsed / ROUND_SECONDS) * 0.65)
      spawnTimer.current += dt
      setBubbles((current) => {
        let next = current
          .map((b) => (b.popped ? b : { ...b, y: b.y - b.speed * dt }))
          .filter((b) => b.y > -0.1 && !b.popped)
        if (spawnTimer.current >= spawnInterval) {
          spawnTimer.current = 0
          const speedBoost = 1 + (elapsed / ROUND_SECONDS) * 0.8
          next = [
            ...next,
            {
              id: nextId.current++,
              x: 0.08 + Math.random() * 0.84,
              y: 1.05,
              size: 44 + Math.random() * 36,
              speed: (0.1 + Math.random() * 0.08) * speedBoost,
              hue: Math.floor(Math.random() * 360),
              popped: false,
            },
          ]
        }
        return next
      })

      if (elapsed >= ROUND_SECONDS) {
        finish()
        return
      }
      raf = requestAnimationFrame(frame)
    }

    function finish() {
      playStar()
      setIsRecord(submitScore(GAME_ID, profile, scoreRef.current))
      setPhase('done')
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const [popEffects, setPopEffects] = useState<Bubble[]>([])

  function pop(id: number) {
    playPop()
    scoreRef.current += 1
    setScore(scoreRef.current)
    setBubbles((current) => {
      const bubble = current.find((b) => b.id === id)
      if (bubble) {
        setPopEffects((fx) => [...fx, bubble])
        setTimeout(() => setPopEffects((fx) => fx.filter((f) => f.id !== id)), 300)
      }
      return current.filter((b) => b.id !== id)
    })
  }

  function start() {
    scoreRef.current = 0
    setScore(0)
    setTimeLeft(ROUND_SECONDS)
    setBubbles([])
    spawnTimer.current = 0
    setPhase('playing')
  }

  return (
    <div className="screen" style={{ maxWidth: 'none', padding: 0 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <BackHeader
          title="Bubbels"
          onBack={onExit}
          right={
            phase === 'playing' ? (
              <span className="star-count">
                ⏱️ {timeLeft} · {score}
              </span>
            ) : undefined
          }
        />
      </div>

      {phase === 'start' && (
        <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <span style={{ fontSize: '4rem' }}>🫧</span>
          <p style={{ textAlign: 'center', maxWidth: 300 }}>
            Tik de bubbels kapot voor ze bovenaan verdwijnen! Je hebt 60 seconden.
          </p>
          <BigButton variant="accent" onClick={start}>
            ▶️ Start!
          </BigButton>
        </div>
      )}

      {phase === 'playing' && (
        <div
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
            touchAction: 'none',
            background: 'linear-gradient(to bottom, #dceefb, #f6f4ee)',
          }}
        >
          {bubbles.map((b) => (
            <button
              key={b.id}
              onPointerDown={() => pop(b.id)}
              aria-label="Bubbel"
              style={{
                position: 'absolute',
                left: `calc(${b.x * 100}% - ${b.size / 2}px)`,
                top: `calc(${b.y * 100}% - ${b.size / 2}px)`,
                width: b.size,
                height: b.size,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, white, hsla(${b.hue}, 80%, 70%, 0.9))`,
                boxShadow: `inset -4px -4px 10px hsla(${b.hue}, 70%, 50%, 0.4)`,
                border: 'none',
              }}
            />
          ))}
          {popEffects.map((b) => (
            <span
              key={`fx-${b.id}`}
              className="bubble-pop"
              style={{
                position: 'absolute',
                left: `calc(${b.x * 100}% - ${b.size / 2}px)`,
                top: `calc(${b.y * 100}% - ${b.size / 2}px)`,
                width: b.size,
                height: b.size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: b.size * 0.7,
                pointerEvents: 'none',
              }}
            >
              ✨
            </span>
          ))}
        </div>
      )}

      {phase === 'done' && (
        <div className="screen">
          <HighscorePanel
            gameId={GAME_ID}
            profile={profile}
            score={score}
            isRecord={isRecord}
            actionLabel="Nog eens spelen"
            onAction={start}
          />
        </div>
      )}
    </div>
  )
}
