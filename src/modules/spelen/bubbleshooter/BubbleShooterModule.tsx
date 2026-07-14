import { useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playClick, playCorrect, playPop, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'
import type { Grid } from './bubbleshooter'
import {
  COLS,
  HUES,
  colsForRow,
  findFloating,
  floodFillSameColor,
  key,
  neighborsOf,
  pickColor,
  randomStartGrid,
  validCell,
} from './bubbleshooter'

const GAME_ID = 'bubbleshooter'
const START_ROWS = 5
const MAX_START_ROWS = 8
const MAX_ROWS_SCAN = 30

type Phase = 'start' | 'playing' | 'done'

interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  color: number
}

interface GameState {
  grid: Grid
  currentColor: number
  nextColor: number
  projectile: Projectile | null
  aiming: boolean
  aimAngle: number
  score: number
  startRows: number
}

interface Geom {
  w: number
  h: number
  radius: number
  diameter: number
  rowHeight: number
  topMargin: number
  shooterY: number
  gameOverY: number
}

function geometry(canvas: HTMLCanvasElement): Geom {
  const w = canvas.width
  const h = canvas.height
  const radius = w / (COLS * 2)
  const diameter = radius * 2
  const rowHeight = diameter * 0.866
  const topMargin = radius * 0.6
  const shooterY = h - radius * 2
  const gameOverY = shooterY - radius * 2.5
  return { w, h, radius, diameter, rowHeight, topMargin, shooterY, gameOverY }
}

function cellCenter(geom: Geom, row: number, col: number): { x: number; y: number } {
  const shift = row % 2 === 1 ? geom.radius : 0
  return { x: col * geom.diameter + shift + geom.radius, y: geom.topMargin + row * geom.rowHeight + geom.radius }
}

function nearestEmptyNeighbor(
  grid: Grid,
  geom: Geom,
  hitRow: number,
  hitCol: number,
  px: number,
  py: number,
): { row: number; col: number } | null {
  let best: { row: number; col: number } | null = null
  let bestDist = Infinity
  for (const [nr, nc] of neighborsOf(hitRow, hitCol)) {
    if (!validCell(nr, nc) || grid.has(key(nr, nc))) continue
    const { x, y } = cellCenter(geom, nr, nc)
    const dist = (x - px) ** 2 + (y - py) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = { row: nr, col: nc }
    }
  }
  if (best) return best
  for (const r of [hitRow - 1, hitRow, hitRow + 1]) {
    if (r < 0) continue
    for (let c = 0; c < colsForRow(r); c++) {
      if (grid.has(key(r, c))) continue
      const { x, y } = cellCenter(geom, r, c)
      const dist = (x - px) ** 2 + (y - py) ** 2
      if (dist < bestDist) {
        bestDist = dist
        best = { row: r, col: c }
      }
    }
  }
  return best
}

function nearestEmptyInRow(grid: Grid, geom: Geom, row: number, px: number): { row: number; col: number } | null {
  let best: { row: number; col: number } | null = null
  let bestDist = Infinity
  for (let c = 0; c < colsForRow(row); c++) {
    if (grid.has(key(row, c))) continue
    const { x } = cellCenter(geom, row, c)
    const dist = Math.abs(x - px)
    if (dist < bestDist) {
      bestDist = dist
      best = { row, col: c }
    }
  }
  return best
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: number) {
  const hue = HUES[color]
  ctx.beginPath()
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2)
  ctx.fillStyle = `hsl(${hue}, 75%, 55%)`
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()
}

export function BubbleShooterModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [hud, setHud] = useState({ score: 0 })
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

    const grid = randomStartGrid(START_ROWS, HUES.length)
    const state: GameState = {
      grid,
      currentColor: pickColor(grid, HUES.length),
      nextColor: pickColor(grid, HUES.length),
      projectile: null,
      aiming: false,
      aimAngle: 0,
      score: 0,
      startRows: START_ROWS,
    }
    stateRef.current = state
    setHud({ score: 0 })

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

    function placeAndResolve(row: number, col: number, color: number, geom: Geom) {
      state.grid.set(key(row, col), color)
      const group = floodFillSameColor(state.grid, row, col)
      if (group.size >= 3) {
        for (const k of group) state.grid.delete(k)
        state.score += group.size * 10
        playPop()
        const floating = findFloating(state.grid, MAX_ROWS_SCAN)
        if (floating.size > 0) {
          for (const k of floating) state.grid.delete(k)
          state.score += floating.size * 15
          playCorrect()
        }
        if (state.grid.size === 0) {
          state.score += 50
          state.startRows = Math.min(state.startRows + 1, MAX_START_ROWS)
          state.grid = randomStartGrid(state.startRows, HUES.length)
          playCorrect()
        }
      } else {
        playClick()
      }
      state.currentColor = state.nextColor
      state.nextColor = pickColor(state.grid, HUES.length)
      state.projectile = null

      for (const k of state.grid.keys()) {
        const r = Number(k.split(',')[0])
        if (cellCenter(geom, r, 0).y >= geom.gameOverY) {
          finish()
          return
        }
      }
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const geom = geometry(canvas!)

      if (state.projectile) {
        const p = state.projectile
        let nx = p.x + p.vx * dt
        let ny = p.y + p.vy * dt
        if (nx - geom.radius < 0) {
          nx = geom.radius
          p.vx = -p.vx
        } else if (nx + geom.radius > geom.w) {
          nx = geom.w - geom.radius
          p.vx = -p.vx
        }

        let landed = false
        if (ny - geom.radius <= geom.topMargin) {
          const target = nearestEmptyInRow(state.grid, geom, 0, nx) ?? { row: 0, col: 0 }
          placeAndResolve(target.row, target.col, p.color, geom)
          landed = true
        } else {
          for (const k of state.grid.keys()) {
            const [r, c] = k.split(',').map(Number)
            const center = cellCenter(geom, r, c)
            const dist = Math.hypot(center.x - nx, center.y - ny)
            if (dist < geom.diameter * 0.95) {
              const target = nearestEmptyNeighbor(state.grid, geom, r, c, nx, ny)
              if (target) placeAndResolve(target.row, target.col, p.color, geom)
              landed = true
              break
            }
          }
        }

        if (!landed) {
          p.x = nx
          p.y = ny
        }
      }

      setHud({ score: state.score })

      // Tekenen
      ctx!.clearRect(0, 0, geom.w, geom.h)
      const bg = ctx!.createLinearGradient(0, 0, 0, geom.h)
      bg.addColorStop(0, '#dceefb')
      bg.addColorStop(1, '#f6f4ee')
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, geom.w, geom.h)

      // Game-over-lijn
      ctx!.strokeStyle = 'rgba(211,51,51,0.4)'
      ctx!.setLineDash([8, 6])
      ctx!.beginPath()
      ctx!.moveTo(0, geom.gameOverY)
      ctx!.lineTo(geom.w, geom.gameOverY)
      ctx!.stroke()
      ctx!.setLineDash([])

      for (const [k, color] of state.grid.entries()) {
        const [r, c] = k.split(',').map(Number)
        const { x, y } = cellCenter(geom, r, c)
        drawBubble(ctx!, x, y, geom.radius, color)
      }

      if (state.projectile) {
        drawBubble(ctx!, state.projectile.x, state.projectile.y, geom.radius, state.projectile.color)
      }

      // Richtlijn
      if (state.aiming && !state.projectile) {
        ctx!.save()
        ctx!.setLineDash([6, 6])
        ctx!.strokeStyle = 'rgba(90,90,90,0.6)'
        ctx!.lineWidth = 2
        ctx!.beginPath()
        ctx!.moveTo(geom.w / 2, geom.shooterY)
        const len = geom.h * 0.32
        ctx!.lineTo(geom.w / 2 + Math.sin(state.aimAngle) * len, geom.shooterY - Math.cos(state.aimAngle) * len)
        ctx!.stroke()
        ctx!.restore()
      }

      // Shooter + volgende bubbel
      drawBubble(ctx!, geom.w / 2, geom.shooterY, geom.radius, state.currentColor)
      drawBubble(ctx!, geom.w / 2 + geom.diameter * 1.6, geom.shooterY, geom.radius * 0.6, state.nextColor)

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

  function updateAim(e: React.PointerEvent) {
    const state = stateRef.current
    const canvas = canvasRef.current
    if (!state || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height
    const geom = geometry(canvas)
    const dx = px - geom.w / 2
    const dy = Math.min(py - geom.shooterY, -geom.radius)
    let angle = Math.atan2(dx, -dy)
    const maxAngle = (75 * Math.PI) / 180
    angle = Math.max(-maxAngle, Math.min(maxAngle, angle))
    state.aimAngle = angle
  }

  function handlePointerDown(e: React.PointerEvent) {
    const state = stateRef.current
    if (!state || state.projectile) return
    state.aiming = true
    updateAim(e)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const state = stateRef.current
    if (!state || !state.aiming) return
    updateAim(e)
  }

  function handlePointerUp() {
    const state = stateRef.current
    const canvas = canvasRef.current
    if (!state || !canvas || !state.aiming) return
    state.aiming = false
    const geom = geometry(canvas)
    const speed = geom.w * 1.3
    state.projectile = {
      x: geom.w / 2,
      y: geom.shooterY - geom.radius,
      vx: Math.sin(state.aimAngle) * speed,
      vy: -Math.cos(state.aimAngle) * speed,
      color: state.currentColor,
    }
    playClick()
  }

  function start() {
    setPhase('playing')
  }

  return (
    <div className="screen" style={{ maxWidth: 'none', padding: 0 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <BackHeader
          title="Bubble Shooter"
          onBack={onExit}
          right={phase === 'playing' ? <span className="star-count">🎯 {hud.score}</span> : undefined}
        />
      </div>

      {phase === 'start' && (
        <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ fontSize: '4rem' }}>🎯</span>
          <p style={{ textAlign: 'center', maxWidth: 300 }}>
            Sleep om te mikken en laat los om te schieten. Maak groepjes van 3 of meer dezelfde kleur om ze te laten
            knappen!
          </p>
          <BigButton variant="accent" onClick={start}>
            ▶️ Start!
          </BigButton>
        </div>
      )}

      {phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', background: '#dceefb', padding: '0 18px' }}>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ flex: 1, width: '100%', touchAction: 'none', display: 'block' }}
          />
        </div>
      )}

      {phase === 'done' && (
        <div className="screen">
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}>🎯 Game over!</p>
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
