import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playClick, playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'
import type { BoardGrid, Piece } from './tetris'
import {
  COLS,
  LINE_SCORES,
  PIECE_COLORS,
  ROWS,
  clearLines,
  collides,
  dropInterval,
  emptyBoard,
  lockPiece,
  newPiece,
  pieceCells,
} from './tetris'

const GAME_ID = 'tetris'

type Phase = 'start' | 'playing' | 'done'

interface GameState {
  board: BoardGrid
  piece: Piece
  score: number
  lines: number
  level: number
}

function initialState(): GameState {
  return { board: emptyBoard(), piece: newPiece(), score: 0, lines: 0, level: 1 }
}

export function TetrisModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [game, setGame] = useState<GameState>(initialState)
  const [isRecord, setIsRecord] = useState(false)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const endGame = useCallback(
    (finalScore: number) => {
      playWrong()
      setIsRecord(submitScore(GAME_ID, profile, finalScore))
      setPhase('done')
    },
    [profile],
  )

  /** Zet het stuk vast, wis lijnen en start een nieuw stuk (of einde spel). */
  const settle = useCallback(
    (state: GameState, piece: Piece): GameState => {
      const locked = lockPiece(state.board, piece)
      const { board, cleared } = clearLines(locked)
      if (cleared > 0) playPop()
      const lines = state.lines + cleared
      const level = Math.floor(lines / 10) + 1
      if (level > state.level) playStar()
      const score = state.score + LINE_SCORES[cleared] * state.level
      const next = newPiece()
      if (collides(board, next)) {
        endGame(score)
        return { board, piece: next, score, lines, level }
      }
      return { board, piece: next, score, lines, level }
    },
    [endGame],
  )

  const softDrop = useCallback(() => {
    setGame((state) => {
      const moved = { ...state.piece, y: state.piece.y + 1 }
      if (collides(state.board, moved)) return settle(state, state.piece)
      return { ...state, piece: moved }
    })
  }, [settle])

  const hardDrop = useCallback(() => {
    playClick()
    setGame((state) => {
      let piece = state.piece
      let next = { ...piece, y: piece.y + 1 }
      while (!collides(state.board, next)) {
        piece = next
        next = { ...piece, y: piece.y + 1 }
      }
      return settle(state, piece)
    })
  }, [settle])

  const move = useCallback((dx: number) => {
    setGame((state) => {
      const moved = { ...state.piece, x: state.piece.x + dx }
      if (collides(state.board, moved)) return state
      playClick()
      return { ...state, piece: moved }
    })
  }, [])

  const rotate = useCallback(() => {
    setGame((state) => {
      const rotated = { ...state.piece, rot: (state.piece.rot + 1) % 4 }
      // eenvoudige wall-kick: probeer ook één plaats links/rechts
      for (const dx of [0, -1, 1, -2, 2]) {
        const candidate = { ...rotated, x: rotated.x + dx }
        if (!collides(state.board, candidate)) {
          playClick()
          return { ...state, piece: candidate }
        }
      }
      return state
    })
  }, [])

  // Zwaartekracht
  useEffect(() => {
    if (phase !== 'playing') return
    const timer = setInterval(softDrop, dropInterval(game.level))
    return () => clearInterval(timer)
  }, [phase, game.level, softDrop])

  // Toetsenbord als extra op desktop
  useEffect(() => {
    if (phase !== 'playing') return
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          move(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          move(1)
          break
        case 'ArrowUp':
          e.preventDefault()
          rotate()
          break
        case 'ArrowDown':
          e.preventDefault()
          softDrop()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, move, rotate, softDrop, hardDrop])

  function start() {
    setGame(initialState())
    setPhase('playing')
  }

  // Swipe omlaag op het speelveld = harde drop
  function onPointerDown(e: React.PointerEvent) {
    swipeStart.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerUp(e: React.PointerEvent) {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dy = e.clientY - start.y
    const dx = e.clientX - start.x
    if (dy > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) hardDrop()
  }

  // Speelveld samenstellen: vast bord + actief stuk
  const cells = [...game.board]
  if (phase === 'playing') {
    for (const [x, y] of pieceCells(game.piece)) {
      if (y >= 0 && x >= 0 && x < COLS && y < ROWS) cells[y * COLS + x] = game.piece.type + 1
    }
  }

  return (
    <div className="screen">
      <BackHeader
        title="Tetris"
        onBack={onExit}
        right={
          phase === 'playing' ? (
            <span className="star-count">
              {game.score} · lvl {game.level}
            </span>
          ) : undefined
        }
      />

      {phase === 'start' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 24 }}>
          <span style={{ fontSize: '4rem' }}>🧱</span>
          <p style={{ textAlign: 'center', maxWidth: 320 }}>
            Maak volle lijnen met de vallende blokken. Veeg omlaag om een blok snel te laten
            vallen!
          </p>
          <BigButton variant="accent" style={{ minWidth: 200 }} onClick={start}>
            ▶️ Start!
          </BigButton>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: 1,
              width: 'min(60vw, 260px)',
              aspectRatio: `${COLS} / ${ROWS}`,
              margin: '0 auto',
              background: '#1d2a3a',
              padding: 4,
              borderRadius: 10,
              boxShadow: 'var(--shadow)',
              touchAction: 'none',
            }}
          >
            {cells.map((cell, i) => (
              <div
                key={i}
                style={{
                  background: cell === 0 ? '#27364a' : PIECE_COLORS[cell - 1],
                  borderRadius: 2,
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              marginTop: 12,
              flexWrap: 'wrap',
            }}
          >
            <BigButton variant="soft" style={{ minWidth: 64 }} onClick={() => move(-1)} aria-label="Links">
              ⬅️
            </BigButton>
            <BigButton variant="soft" style={{ minWidth: 64 }} onClick={rotate} aria-label="Draaien">
              🔄
            </BigButton>
            <BigButton variant="soft" style={{ minWidth: 64 }} onClick={softDrop} aria-label="Zachte drop">
              ⬇️
            </BigButton>
            <BigButton variant="soft" style={{ minWidth: 64 }} onClick={() => move(1)} aria-label="Rechts">
              ➡️
            </BigButton>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.85rem' }}>
            Veeg omlaag over het veld voor een snelle drop · {game.lines} lijnen
          </p>
        </>
      )}

      {phase === 'done' && (
        <>
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}>Spel voorbij!</p>
          <HighscorePanel
            gameId={GAME_ID}
            profile={profile}
            score={game.score}
            isRecord={isRecord}
            actionLabel="Nog eens spelen"
            onAction={start}
          />
        </>
      )}
    </div>
  )
}
