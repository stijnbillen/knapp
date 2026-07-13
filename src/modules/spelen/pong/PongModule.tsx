import { useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playClick, playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'

const GAME_ID = 'pong'
const WIN_SCORE = 5

// Verticale opstelling: speler onderaan, computer bovenaan — handig op gsm.
const DIFFICULTIES = [
  { label: '😌 Makkelijk', aiSpeed: 0.35, ballSpeed: 0.55, multiplier: 1 },
  { label: '🙂 Middel', aiSpeed: 0.55, ballSpeed: 0.7, multiplier: 2 },
  { label: '😈 Moeilijk', aiSpeed: 0.85, ballSpeed: 0.9, multiplier: 3 },
]

type Phase = 'start' | 'playing' | 'done'

interface GameState {
  ballX: number // 0..1
  ballY: number
  velX: number // fractie per seconde
  velY: number
  playerX: number // midden van de peddel, 0..1
  aiX: number
  playerScore: number
  aiScore: number
}

const PADDLE_W = 0.22 // fractie van de breedte
const PADDLE_H = 0.025
const BALL_R = 0.02

function serve(state: GameState, toPlayer: boolean, speed: number): void {
  state.ballX = 0.5
  state.ballY = 0.5
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI
  state.velX = Math.sin(angle) * speed
  state.velY = (toPlayer ? 1 : -1) * Math.cos(angle) * speed
}

export function PongModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [difficulty, setDifficulty] = useState(0)
  const [scores, setScores] = useState({ player: 0, ai: 0 })
  const [finalScore, setFinalScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)
  const [won, setWon] = useState(false)
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
      ballX: 0.5,
      ballY: 0.5,
      velX: 0,
      velY: 0,
      playerX: 0.5,
      aiX: 0.5,
      playerScore: 0,
      aiScore: 0,
    }
    stateRef.current = state
    serve(state, true, conf.ballSpeed)

    let raf = 0
    let last = performance.now()

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width * devicePixelRatio
      canvas!.height = rect.height * devicePixelRatio
    }
    resize()

    function finish(playerWon: boolean) {
      cancelAnimationFrame(raf)
      const score = (state.playerScore + (playerWon ? WIN_SCORE : 0)) * conf.multiplier
      setWon(playerWon)
      setFinalScore(score)
      setIsRecord(submitScore(GAME_ID, profile, score))
      if (playerWon) playStar()
      else playWrong()
      setPhase('done')
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Bal bewegen
      state.ballX += state.velX * dt
      state.ballY += state.velY * dt

      // Zijmuren
      if (state.ballX < BALL_R) {
        state.ballX = BALL_R
        state.velX = Math.abs(state.velX)
      } else if (state.ballX > 1 - BALL_R) {
        state.ballX = 1 - BALL_R
        state.velX = -Math.abs(state.velX)
      }

      // Computerpeddel volgt de bal (met beperkte snelheid)
      const diff = state.ballX - state.aiX
      const maxStep = conf.aiSpeed * dt
      state.aiX += Math.max(-maxStep, Math.min(maxStep, diff))

      // Botsing met peddels
      const playerY = 0.94
      const aiY = 0.06
      if (
        state.velY > 0 &&
        state.ballY + BALL_R >= playerY &&
        state.ballY + BALL_R <= playerY + PADDLE_H + 0.02 &&
        Math.abs(state.ballX - state.playerX) < PADDLE_W / 2 + BALL_R
      ) {
        state.velY = -Math.abs(state.velY) * 1.03
        state.velX += ((state.ballX - state.playerX) / (PADDLE_W / 2)) * 0.3
        playPop()
      }
      if (
        state.velY < 0 &&
        state.ballY - BALL_R <= aiY + PADDLE_H &&
        state.ballY - BALL_R >= aiY - 0.02 &&
        Math.abs(state.ballX - state.aiX) < PADDLE_W / 2 + BALL_R
      ) {
        state.velY = Math.abs(state.velY) * 1.03
        state.velX += ((state.ballX - state.aiX) / (PADDLE_W / 2)) * 0.2
        playClick()
      }

      // Punt gescoord?
      if (state.ballY > 1.05) {
        state.aiScore += 1
        setScores({ player: state.playerScore, ai: state.aiScore })
        if (state.aiScore >= WIN_SCORE) return finish(false)
        serve(state, false, conf.ballSpeed)
      } else if (state.ballY < -0.05) {
        state.playerScore += 1
        setScores({ player: state.playerScore, ai: state.aiScore })
        playPop()
        if (state.playerScore >= WIN_SCORE) return finish(true)
        serve(state, true, conf.ballSpeed)
      }

      // Tekenen
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = '#1d2a3a'
      ctx!.fillRect(0, 0, w, h)
      ctx!.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx!.setLineDash([10, 14])
      ctx!.beginPath()
      ctx!.moveTo(0, h / 2)
      ctx!.lineTo(w, h / 2)
      ctx!.stroke()
      ctx!.setLineDash([])

      ctx!.fillStyle = '#ffffff'
      const pw = PADDLE_W * w
      const ph = Math.max(PADDLE_H * h, 10)
      // Spelerpeddel (accentkleur)
      ctx!.fillStyle = getComputedStyle(canvas!).getPropertyValue('--accent') || '#3b7fd6'
      ctx!.fillRect(state.playerX * w - pw / 2, playerY * h, pw, ph)
      // Computerpeddel
      ctx!.fillStyle = '#e8b93d'
      ctx!.fillRect(state.aiX * w - pw / 2, aiY * h - ph, pw, ph)
      // Bal
      ctx!.fillStyle = '#ffffff'
      ctx!.beginPath()
      ctx!.arc(state.ballX * w, state.ballY * h, BALL_R * w, 0, Math.PI * 2)
      ctx!.fill()

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
    state.playerX = Math.max(PADDLE_W / 2, Math.min(1 - PADDLE_W / 2, x))
  }

  return (
    <div className="screen" style={{ maxWidth: 'none', padding: 0 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <BackHeader
          title="Pong"
          onBack={onExit}
          right={
            phase === 'playing' ? (
              <span className="star-count">
                {scores.player} – {scores.ai}
              </span>
            ) : undefined
          }
        />
      </div>

      {phase === 'start' && (
        <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ fontSize: '4rem' }}>🏓</span>
          <p style={{ textAlign: 'center', maxWidth: 320 }}>
            Schuif je peddel met je vinger. Wie eerst 5 punten heeft, wint!
          </p>
          {DIFFICULTIES.map((d, i) => (
            <BigButton
              key={d.label}
              variant={i === 0 ? 'accent' : 'soft'}
              style={{ minWidth: 220 }}
              onClick={() => {
                setDifficulty(i)
                setScores({ player: 0, ai: 0 })
                setPhase('playing')
              }}
            >
              {d.label}
            </BigButton>
          ))}
        </div>
      )}

      {phase === 'playing' && (
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          style={{ flex: 1, width: '100%', touchAction: 'none', display: 'block' }}
        />
      )}

      {phase === 'done' && (
        <div className="screen">
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
            {won ? '🏆 Gewonnen!' : '😅 Net niet! Probeer nog eens.'}
          </p>
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
