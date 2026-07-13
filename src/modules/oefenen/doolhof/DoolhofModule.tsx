import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playClick, playStar } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'
import type { Direction, Maze } from './maze'
import { canMove, generateMaze, moveDelta } from './maze'

const MODULE_ID = 'doolhof'

// Vrij te kiezen groottes, van kleuterproof tot echt pittig.
const SIZES: { size: number; label: string }[] = [
  { size: 5, label: '😌 Mini (5×5)' },
  { size: 9, label: '🙂 Klein (9×9)' },
  { size: 11, label: '😃 Middel (11×11)' },
  { size: 13, label: '😅 Groot (13×13)' },
  { size: 17, label: '😈 Reuze (17×17)' },
  { size: 21, label: '🤯 Monster (21×21)' },
]

const PLAYER = '🐰'
const GOAL = '🥕'

export function DoolhofModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<'kies' | 'spelen'>('kies')
  const [size, setSize] = useState(SIZES[0].size)
  const [maze, setMaze] = useState<Maze | null>(null)
  const [pos, setPos] = useState({ row: 0, col: 0 })
  const [won, setWon] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

  function startMaze(chosenSize: number) {
    setSize(chosenSize)
    setMaze(generateMaze(chosenSize))
    setPos({ row: 0, col: 0 })
    setWon(false)
    setPhase('spelen')
  }

  const tryMove = useCallback(
    (dir: Direction) => {
      if (won || !maze) return
      setPos((current) => {
        if (!canMove(maze, current.row, current.col, dir)) return current
        const { dr, dc } = moveDelta(dir)
        playClick()
        return { row: current.row + dr, col: current.col + dc }
      })
    },
    [maze, won],
  )

  // Winst detecteren zodra het figuurtje het doel bereikt
  useEffect(() => {
    if (won || !maze) return
    if (pos.row === maze.size - 1 && pos.col === maze.size - 1) {
      recordAnswer(profile.id, MODULE_ID, true)
      playStar()
      setStarTrigger((n) => n + 1)
      setWon(true)
    }
  }, [pos, maze, won, profile.id])

  // Toetsenbord als extra op desktop
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        tryMove(dir)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tryMove])

  // Vinger slepen: beweeg naar de cel onder de vinger als die aangrenzend en open is
  function handlePointerMove(e: React.PointerEvent) {
    if (won || !maze || e.buttons === 0) return
    const grid = gridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * maze.size)
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * maze.size)
    if (row < 0 || row >= maze.size || col < 0 || col >= maze.size) return

    const dr = row - pos.row
    const dc = col - pos.col
    if (Math.abs(dr) + Math.abs(dc) !== 1) return
    const dir: Direction = dr === -1 ? 'up' : dr === 1 ? 'down' : dc === -1 ? 'left' : 'right'
    tryMove(dir)
  }

  if (phase === 'kies') {
    return (
      <div className="screen">
        <BackHeader title="Doolhof" onBack={onExit} right={<StarCount profileId={profile.id} />} />
        <p style={{ textAlign: 'center', margin: '8px 0 16px' }}>
          {PLAYER} Hoe groot mag het doolhof zijn?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {SIZES.map((option) => (
            <BigButton
              key={option.size}
              variant={option.size === size ? 'accent' : 'soft'}
              style={{ minWidth: 240 }}
              onClick={() => startMaze(option.size)}
            >
              {option.label}
            </BigButton>
          ))}
        </div>
      </div>
    )
  }

  // Bij grote rasters zijn dunnere muren leesbaarder
  const wallWidth = maze && maze.size > 11 ? 2 : 3
  const wall = `${wallWidth}px solid #7a6f5d`
  const open = `${wallWidth}px solid transparent`

  return (
    <div className="screen">
      <BackHeader
        title="Doolhof"
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton variant="ghost" onClick={() => setPhase('kies')} aria-label="Andere grootte">
              ⚙️
            </BigButton>
          </div>
        }
      />

      <p style={{ textAlign: 'center', margin: '4px 0 12px', fontSize: '1.15rem' }}>
        {PLAYER} ➜ {GOAL}
      </p>

      {maze && (
        <div
          ref={gridRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maze.size}, 1fr)`,
            width: 'min(90vw, 420px)',
            aspectRatio: '1',
            margin: '0 auto',
            background: 'var(--surface)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          {maze.cells.map((rowCells, row) =>
            rowCells.map((cell, col) => {
              const isPlayer = pos.row === row && pos.col === col
              const isGoal = row === maze.size - 1 && col === maze.size - 1
              return (
                <div
                  key={`${row}-${col}`}
                  style={{
                    borderTop: cell.top ? wall : open,
                    borderRight: cell.right ? wall : open,
                    borderBottom: cell.bottom ? wall : open,
                    borderLeft: cell.left ? wall : open,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: `min(${320 / maze.size}px, 2rem)`,
                    lineHeight: 1,
                  }}
                >
                  {isPlayer ? (
                    <span className={won ? 'star-burst__star' : ''} style={{ fontSize: 'inherit' }}>
                      {PLAYER}
                    </span>
                  ) : isGoal ? (
                    GOAL
                  ) : null}
                </div>
              )
            }),
          )}
        </div>
      )}

      {!won && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 64px)',
            gridTemplateRows: 'repeat(2, 64px)',
            gap: 8,
            justifyContent: 'center',
            marginTop: 16,
          }}
        >
          <span />
          <BigButton variant="soft" onClick={() => tryMove('up')} aria-label="Omhoog">
            ⬆️
          </BigButton>
          <span />
          <BigButton variant="soft" onClick={() => tryMove('left')} aria-label="Links">
            ⬅️
          </BigButton>
          <BigButton variant="soft" onClick={() => tryMove('down')} aria-label="Omlaag">
            ⬇️
          </BigButton>
          <BigButton variant="soft" onClick={() => tryMove('right')} aria-label="Rechts">
            ➡️
          </BigButton>
        </div>
      )}

      {won && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🥕🎉</span>
          <div>Je vond de wortel!</div>
          <BigButton variant="accent" onClick={() => startMaze(size)}>
            Nog een doolhof
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
