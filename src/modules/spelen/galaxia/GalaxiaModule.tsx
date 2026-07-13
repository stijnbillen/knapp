import { useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playClick, playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'

const GAME_ID = 'galaxia'
const LIVES_START = 3
const SHIP_W = 0.16
const ENEMY_W = 0.14
const BULLET_R = 0.008

const DIFFICULTIES = [
  { label: '😌 Makkelijk', enemySpeed: 0.1, spawnInterval: 1.1, fireInterval: 0.4 },
  { label: '🙂 Middel', enemySpeed: 0.16, spawnInterval: 0.85, fireInterval: 0.32 },
  { label: '😈 Moeilijk', enemySpeed: 0.24, spawnInterval: 0.6, fireInterval: 0.26 },
]

type Phase = 'start' | 'playing' | 'done'

interface Bullet {
  x: number
  y: number
}

interface Enemy {
  x: number
  y: number
  drift: number
}

interface GameState {
  shipX: number
  bullets: Bullet[]
  enemies: Enemy[]
  score: number
  lives: number
  fireTimer: number
  spawnTimer: number
  elapsed: number
}

export function GalaxiaModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [difficulty, setDifficulty] = useState(0)
  const [hud, setHud] = useState({ score: 0, lives: LIVES_START })
  const [finalScore, setFinalScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState | null>(null)

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const conf = DIFFICULTIES[difficulty]
    const state: GameState = {
      shipX: 0.5,
      bullets: [],
      enemies: [],
      score: 0,
      lives: LIVES_START,
      fireTimer: 0,
      spawnTimer: 0,
      elapsed: 0,
    }
    stateRef.current = state
    setHud({ score: 0, lives: LIVES_START })

    let raf = 0
    let last = performance.now()

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width * devicePixelRatio
      canvas!.height = rect.height * devicePixelRatio
    }
    resize()

    function finish() {
      cancelAnimationFrame(raf)
      setFinalScore(state.score)
      setIsRecord(submitScore(GAME_ID, profile, state.score))
      playWrong()
      setPhase('done')
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      state.elapsed += dt

      const speedBoost = 1 + Math.min(state.elapsed / 45, 0.6)
      const enemySpeed = conf.enemySpeed * speedBoost

      // Automatisch vuren
      state.fireTimer += dt
      if (state.fireTimer >= conf.fireInterval) {
        state.fireTimer = 0
        state.bullets.push({ x: state.shipX, y: 0.9 })
        playClick()
      }

      // Vijanden spawnen
      state.spawnTimer += dt
      if (state.spawnTimer >= conf.spawnInterval) {
        state.spawnTimer = 0
        state.enemies.push({
          x: 0.1 + Math.random() * 0.8,
          y: -0.06,
          drift: (Math.random() - 0.5) * 0.15,
        })
      }

      // Kogels bewegen
      state.bullets = state.bullets.filter((b) => b.y > -0.05)
      state.bullets.forEach((b) => (b.y -= 0.9 * dt))

      // Vijanden bewegen
      state.enemies.forEach((e) => {
        e.y += enemySpeed * dt
        e.x += e.drift * dt
      })

      // Botsing kogel-vijand
      const w = canvas!.width
      const h = canvas!.height
      const hitRadius = (ENEMY_W / 2) * w * 0.7
      for (const enemy of state.enemies) {
        for (const bullet of state.bullets) {
          const dx = (bullet.x - enemy.x) * w
          const dy = (bullet.y - enemy.y) * h
          if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
            enemy.y = 2 // markeer voor verwijdering
            bullet.y = -1
            state.score += 1
            if (state.score % 10 === 0) playStar()
            else playPop()
          }
        }
      }
      state.bullets = state.bullets.filter((b) => b.y > -0.5)

      // Vijand bereikt het schip of de bodem
      const survivors: Enemy[] = []
      for (const enemy of state.enemies) {
        if (enemy.y >= 2) continue // net geraakt
        if (enemy.y > 1.05) {
          state.lives -= 1
          playWrong()
          continue
        }
        if (
          enemy.y > 0.86 &&
          enemy.y < 0.98 &&
          Math.abs(enemy.x - state.shipX) < SHIP_W / 2 + ENEMY_W / 2
        ) {
          state.lives -= 1
          playWrong()
          continue
        }
        survivors.push(enemy)
      }
      state.enemies = survivors

      setHud({ score: state.score, lives: state.lives })
      if (state.lives <= 0) {
        finish()
        return
      }

      // Tekenen
      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = '#0b1026'
      ctx!.fillRect(0, 0, w, h)

      // Sterrenveld (stil, gebaseerd op vaste zaadwaarden voor stabiliteit)
      ctx!.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137) % 100) / 100
        const sy = ((i * 71 + state.elapsed * 6) % 100) / 100
        ctx!.fillRect(sx * w, sy * h, 2, 2)
      }

      const emojiSize = ENEMY_W * w
      ctx!.font = `${emojiSize}px sans-serif`
      ctx!.textAlign = 'center'
      ctx!.textBaseline = 'middle'

      state.enemies.forEach((e) => {
        ctx!.fillText('👾', e.x * w, e.y * h)
      })

      ctx!.fillStyle = '#ffe066'
      state.bullets.forEach((b) => {
        ctx!.beginPath()
        ctx!.arc(b.x * w, b.y * h, BULLET_R * w, 0, Math.PI * 2)
        ctx!.fill()
      })

      ctx!.font = `${SHIP_W * w}px sans-serif`
      ctx!.fillText('🚀', state.shipX * w, 0.92 * h)

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function handlePointer(e: React.PointerEvent) {
    const state = stateRef.current
    const canvas = canvasRef.current
    if (!state || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    state.shipX = Math.max(SHIP_W / 2, Math.min(1 - SHIP_W / 2, x))
  }

  function start() {
    setPhase('playing')
  }

  return (
    <div className="screen" style={{ maxWidth: 'none', padding: 0 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <BackHeader
          title="Galaxia"
          onBack={onExit}
          right={
            phase === 'playing' ? (
              <span className="star-count">
                🚀 {hud.score} · {'❤️'.repeat(hud.lives)}
              </span>
            ) : undefined
          }
        />
      </div>

      {phase === 'start' && (
        <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ fontSize: '4rem' }}>🚀</span>
          <p style={{ textAlign: 'center', maxWidth: 320 }}>
            Schuif je raket met je vinger en schiet de ruimtewezentjes neer. Je hebt {LIVES_START} levens!
          </p>
          {DIFFICULTIES.map((d, i) => (
            <BigButton
              key={d.label}
              variant={i === 0 ? 'accent' : 'soft'}
              style={{ minWidth: 220 }}
              onClick={() => {
                setDifficulty(i)
                start()
              }}
            >
              {d.label}
            </BigButton>
          ))}
        </div>
      )}

      {phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', background: '#0b1026', padding: '0 18px' }}>
          <canvas
            ref={canvasRef}
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            style={{ flex: 1, width: '100%', touchAction: 'none', display: 'block' }}
          />
        </div>
      )}

      {phase === 'done' && (
        <div className="screen">
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}>👾 Game over!</p>
          <HighscorePanel
            gameId={GAME_ID}
            profile={profile}
            score={finalScore}
            isRecord={isRecord}
            actionLabel="Nog eens spelen"
            onAction={() => setPhase('start')}
          />
        </div>
      )}
    </div>
  )
}
