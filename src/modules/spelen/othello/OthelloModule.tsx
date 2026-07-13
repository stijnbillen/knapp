import { useEffect, useMemo, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playClick, playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'
import type { Board } from './othello'
import { aiChooseMove, applyMove, countDiscs, initialBoard, validMoves } from './othello'

const GAME_ID = 'othello'

type Phase = 'start' | 'playing' | 'done'

export function OthelloModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [level, setLevel] = useState<1 | 2>(1)
  const [board, setBoard] = useState<Board>(initialBoard)
  const [turn, setTurn] = useState<1 | 2>(1) // speler begint (zwart)
  const [message, setMessage] = useState('')
  const [finalScore, setFinalScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)
  const [playerWon, setPlayerWon] = useState(false)

  const moves = useMemo(() => (turn === 1 ? validMoves(board, 1) : []), [board, turn])
  const discs = countDiscs(board)

  // Computerbeurt (met korte denkpauze) + doorgeef-/eindlogica
  useEffect(() => {
    if (phase !== 'playing') return

    const playerMoves = validMoves(board, 1)
    const aiMoves = validMoves(board, 2)

    if (playerMoves.length === 0 && aiMoves.length === 0) {
      // Spel voorbij
      const { player, ai } = countDiscs(board)
      const won = player > ai
      setPlayerWon(won)
      const score = won ? player : 0
      setFinalScore(player)
      setIsRecord(won ? submitScore(GAME_ID, profile, score) : false)
      if (won) playStar()
      else playWrong()
      setPhase('done')
      return
    }

    if (turn === 2) {
      if (aiMoves.length === 0) {
        setMessage('De computer kan niet spelen — jij bent weer!')
        setTurn(1)
        return
      }
      const timer = setTimeout(() => {
        const move = aiChooseMove(board, level)
        if (move) {
          playClick()
          setBoard((b) => applyMove(b, 2, move))
        }
        setTurn(1)
      }, 700)
      return () => clearTimeout(timer)
    }

    if (turn === 1 && playerMoves.length === 0) {
      setMessage('Je kan niet spelen — de computer is weer.')
      setTurn(2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn, board])

  function tapCell(index: number) {
    if (phase !== 'playing' || turn !== 1) return
    const move = moves.find((m) => m.index === index)
    if (!move) return
    playPop()
    setMessage('')
    setBoard((b) => applyMove(b, 1, move))
    setTurn(2)
  }

  function start(chosenLevel: 1 | 2) {
    setLevel(chosenLevel)
    setBoard(initialBoard())
    setTurn(1)
    setMessage('')
    setPhase('playing')
  }

  return (
    <div className="screen">
      <BackHeader
        title="Othello"
        onBack={onExit}
        right={
          phase === 'playing' ? (
            <span className="star-count">
              ⚫ {discs.player} · ⚪ {discs.ai}
            </span>
          ) : undefined
        }
      />

      {phase === 'start' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 24 }}>
          <span style={{ fontSize: '4rem' }}>⚫⚪</span>
          <p style={{ textAlign: 'center', maxWidth: 320 }}>
            Jij speelt met zwart. Sluit schijven van de computer in om ze om te draaien. Wie op het
            einde de meeste schijven heeft, wint!
          </p>
          <BigButton variant="accent" style={{ minWidth: 220 }} onClick={() => start(1)}>
            🙂 Niveau 1
          </BigButton>
          <BigButton variant="soft" style={{ minWidth: 220 }} onClick={() => start(2)}>
            😈 Niveau 2
          </BigButton>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <p style={{ textAlign: 'center', minHeight: 24, margin: '4px 0', color: 'var(--text-soft)' }}>
            {message || (turn === 1 ? 'Jij bent aan zet (zwart)' : 'De computer denkt na…')}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 2,
              width: 'min(92vw, 440px)',
              aspectRatio: '1',
              margin: '0 auto',
              background: '#2e6b3e',
              padding: 6,
              borderRadius: 12,
              boxShadow: 'var(--shadow)',
            }}
          >
            {board.map((cell, i) => {
              const isValid = moves.some((m) => m.index === i)
              return (
                <button
                  key={i}
                  onClick={() => tapCell(i)}
                  aria-label={`Veld ${Math.floor(i / 8) + 1},${(i % 8) + 1}`}
                  style={{
                    background: '#3d8a50',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    minWidth: 0,
                    minHeight: 0,
                    padding: 0,
                  }}
                >
                  {cell !== 0 && (
                    <span
                      style={{
                        width: '78%',
                        height: '78%',
                        borderRadius: '50%',
                        background: cell === 1 ? '#222' : '#f5f5f0',
                        boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.3)',
                        transition: 'background 0.25s ease',
                      }}
                    />
                  )}
                  {cell === 0 && isValid && (
                    <span
                      style={{
                        width: '30%',
                        height: '30%',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.35)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {phase === 'done' && (
        <>
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
            {playerWon
              ? `🏆 Gewonnen met ${discs.player} tegen ${discs.ai}!`
              : discs.player === discs.ai
                ? `🤝 Gelijkspel: ${discs.player} – ${discs.ai}`
                : `😅 De computer won met ${discs.ai} tegen ${discs.player}.`}
          </p>
          <HighscorePanel
            gameId={GAME_ID}
            profile={profile}
            score={finalScore}
            isRecord={isRecord}
            actionLabel="Nog eens spelen"
            onAction={() => setPhase('start')}
          />
        </>
      )}
    </div>
  )
}
