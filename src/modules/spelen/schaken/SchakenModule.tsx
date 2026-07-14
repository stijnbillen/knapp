import { useEffect, useMemo, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playClick, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'
import { StarBurst } from '../../../ui/StarBurst'
import type { Color, GameState, GameStatus, Move, PieceType } from './chess'
import {
  aiChooseMove,
  applyMove,
  gameStatus,
  initialGameState,
  isInCheck,
  legalMovesForSquare,
  needsPromotionChoice,
  opposite,
  pieceMovesOnEmptyBoard,
} from './chess'

const GAME_ID = 'schaken'

const PIECE_SYMBOLS: Record<Color, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
}

const PIECE_INFO: { type: PieceType; naam: string; uitleg: string }[] = [
  { type: 'P', naam: 'Pion', uitleg: 'Beweegt recht vooruit, één stap (of twee vanaf de startrij). Slaat schuin vooruit.' },
  { type: 'N', naam: 'Paard', uitleg: 'Springt in een L-vorm: twee stappen in één richting, dan één stap opzij. Kan over andere stukken springen.' },
  { type: 'B', naam: 'Loper', uitleg: 'Beweegt enkel schuin, zo ver hij wil.' },
  { type: 'R', naam: 'Toren', uitleg: 'Beweegt recht (horizontaal of verticaal), zo ver hij wil.' },
  { type: 'Q', naam: 'Dame', uitleg: 'De sterkste! Beweegt recht én schuin, zo ver ze wil.' },
  { type: 'K', naam: 'Koning', uitleg: 'Beweegt één stapje in eender welke richting. Moet altijd beschermd blijven!' },
]

const PROMOTION_CHOICES: PieceType[] = ['Q', 'R', 'B', 'N']

type Phase = 'start' | 'uitleg' | 'playing' | 'done'
type Mode = 'computer' | 'twee'

interface Result {
  status: GameStatus
  winner: Color | null
}

export function SchakenModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [mode, setMode] = useState<Mode>('computer')
  const [level, setLevel] = useState<1 | 2>(1)
  const [uitlegType, setUitlegType] = useState<PieceType>('P')
  const [state, setState] = useState<GameState>(() => initialGameState())
  const [selected, setSelected] = useState<number | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<Move | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [finalScore, setFinalScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)

  const legalTargets = useMemo(
    () => (selected !== null ? legalMovesForSquare(state, selected).map((m) => m.to) : []),
    [state, selected],
  )

  function finishGame(status: GameStatus) {
    const winner = status === 'checkmate' ? opposite(state.turn) : null
    setResult({ status, winner })
    setPhase('done')
    if (mode === 'computer') {
      if (winner === 'w') {
        playStar()
        setStarTrigger((n) => n + 1)
        const score = 20 * level
        setFinalScore(score)
        setIsRecord(submitScore(GAME_ID, profile, score))
      } else if (winner === 'b') {
        playWrong()
      }
    } else if (winner) {
      playStar()
      setStarTrigger((n) => n + 1)
    }
  }

  // Status na elke zet checken (schaakmat/pat/te weinig materiaal)
  useEffect(() => {
    if (phase !== 'playing') return
    const status = gameStatus(state)
    if (status !== 'playing') finishGame(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state])

  // Computerzet
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'computer' || state.turn !== 'b') return
    if (gameStatus(state) !== 'playing') return
    const timer = setTimeout(() => {
      const move = aiChooseMove(state, level)
      if (move) {
        playClick()
        setState((s) => applyMove(s, move))
      }
    }, 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, state])

  function start() {
    setState(initialGameState())
    setSelected(null)
    setPendingPromotion(null)
    setResult(null)
    setFinalScore(0)
    setIsRecord(false)
    setPhase('playing')
  }

  function tapSquare(index: number) {
    if (phase !== 'playing' || pendingPromotion) return
    if (mode === 'computer' && state.turn === 'b') return

    const piece = state.board[index]
    if (selected !== null) {
      const move = legalMovesForSquare(state, selected).find((m) => m.to === index)
      if (move) {
        if (needsPromotionChoice(move)) {
          setPendingPromotion(move)
          setSelected(null)
          return
        }
        playClick()
        setState((s) => applyMove(s, move))
        setSelected(null)
        return
      }
      if (piece && piece.color === state.turn) {
        setSelected(index)
        return
      }
      setSelected(null)
      return
    }
    if (piece && piece.color === state.turn) setSelected(index)
  }

  function choosePromotion(type: PieceType) {
    if (!pendingPromotion) return
    playClick()
    setState((s) => applyMove(s, { ...pendingPromotion, promoteTo: type }))
    setPendingPromotion(null)
  }

  if (phase === 'start') {
    return (
      <div className="screen">
        <BackHeader title="Schaken" onBack={onExit} />
        <p style={{ textAlign: 'center', margin: '8px 0 16px' }}>
          ♟️ Verover de koning van je tegenstander!
        </p>

        <div className="form-field">
          <label>Hoe wil je spelen?</label>
          <div className="picker-grid">
            <BigButton variant={mode === 'computer' ? 'accent' : 'soft'} onClick={() => setMode('computer')}>
              🤖 Tegen de computer
            </BigButton>
            <BigButton variant={mode === 'twee' ? 'accent' : 'soft'} onClick={() => setMode('twee')}>
              👥 2 spelers
            </BigButton>
          </div>
        </div>

        {mode === 'computer' && (
          <div className="form-field">
            <label>Hoe sterk speelt de computer?</label>
            <div className="picker-grid">
              <BigButton variant={level === 1 ? 'accent' : 'soft'} onClick={() => setLevel(1)}>
                🙂 Niveau 1
              </BigButton>
              <BigButton variant={level === 2 ? 'accent' : 'soft'} onClick={() => setLevel(2)}>
                😈 Niveau 2
              </BigButton>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <BigButton variant="accent" style={{ minWidth: 220 }} onClick={start}>
            ▶️ Start
          </BigButton>
          <BigButton variant="ghost" onClick={() => setPhase('uitleg')}>
            ❓ Hoe bewegen de stukken?
          </BigButton>
        </div>
      </div>
    )
  }

  if (phase === 'uitleg') {
    const info = PIECE_INFO.find((p) => p.type === uitlegType)!
    const demoIndex = uitlegType === 'P' ? 6 * 8 + 4 : 4 * 8 + 4
    const targets = pieceMovesOnEmptyBoard(uitlegType, 'w', demoIndex)
    return (
      <div className="screen">
        <BackHeader title="Hoe bewegen de stukken?" onBack={() => setPhase('start')} />

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', margin: '8px 0 16px' }}>
          {PIECE_INFO.map((p) => (
            <BigButton
              key={p.type}
              variant={p.type === uitlegType ? 'accent' : 'soft'}
              style={{ fontSize: '1.6rem', minWidth: 56 }}
              onClick={() => setUitlegType(p.type)}
            >
              {PIECE_SYMBOLS.w[p.type]}
            </BigButton>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            width: 'min(80vw, 320px)',
            aspectRatio: '1',
            margin: '0 auto',
            boxShadow: 'var(--shadow)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 64 }, (_, i) => {
            const light = (Math.floor(i / 8) + (i % 8)) % 2 === 0
            return (
              <div
                key={i}
                style={{
                  background: light ? '#f0ead6' : '#b58863',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  fontSize: '1.7rem',
                }}
              >
                {i === demoIndex && PIECE_SYMBOLS.w[uitlegType]}
                {targets.includes(i) && (
                  <span
                    style={{
                      position: 'absolute',
                      width: '28%',
                      height: '28%',
                      borderRadius: '50%',
                      background: 'rgba(59, 127, 214, 0.6)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', fontWeight: 700, margin: '16px 0 4px' }}>{info.naam}</p>
        <p style={{ textAlign: 'center', color: 'var(--text-soft)', maxWidth: 360, margin: '0 auto' }}>
          {info.uitleg}
        </p>
      </div>
    )
  }

  const check = phase === 'playing' && isInCheck(state, state.turn)

  return (
    <div className="screen">
      <BackHeader
        title="Schaken"
        onBack={onExit}
        right={
          phase === 'playing' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="star-count">
                {state.turn === 'w' ? '⚪' : '⚫'} aan zet{check ? ' · Schaak!' : ''}
              </span>
              <BigButton variant="ghost" onClick={() => setPhase('start')} aria-label="Nieuw spel">
                ⚙️
              </BigButton>
            </div>
          ) : undefined
        }
      />

      {phase === 'playing' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              width: 'min(92vw, 440px)',
              aspectRatio: '1',
              margin: '0 auto',
              boxShadow: 'var(--shadow)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {state.board.map((cell, i) => {
              const light = (Math.floor(i / 8) + (i % 8)) % 2 === 0
              const isSelected = selected === i
              const isTarget = legalTargets.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => tapSquare(i)}
                  aria-label={cell ? `${cell.color === 'w' ? 'wit' : 'zwart'} ${cell.type}` : 'Leeg veld'}
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : light ? '#f0ead6' : '#b58863',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: '1.9rem',
                    lineHeight: 1,
                  }}
                >
                  {cell && PIECE_SYMBOLS[cell.color][cell.type]}
                  {!cell && isTarget && (
                    <span
                      style={{
                        position: 'absolute',
                        width: '26%',
                        height: '26%',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.25)',
                      }}
                    />
                  )}
                  {cell && isTarget && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 2,
                        border: '3px solid rgba(200,40,40,0.7)',
                        borderRadius: 6,
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {mode === 'computer' && state.turn === 'b' && (
            <p style={{ textAlign: 'center', color: 'var(--text-soft)', marginTop: 8 }}>
              De computer denkt na…
            </p>
          )}
        </>
      )}

      {pendingPromotion && (
        <div className="feedback-panel feedback-panel--good">
          <div>Kies een stuk voor je pion:</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {PROMOTION_CHOICES.map((t) => (
              <BigButton
                key={t}
                variant="soft"
                style={{ fontSize: '1.8rem' }}
                onClick={() => choosePromotion(t)}
              >
                {PIECE_SYMBOLS[pendingPromotion.piece.color][t]}
              </BigButton>
            ))}
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <>
          <p style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, margin: '16px 0 0' }}>
            {result.status === 'checkmate'
              ? mode === 'computer'
                ? result.winner === 'w'
                  ? '🏆 Schaakmat! Jij wint!'
                  : '😅 Schaakmat… de computer wint.'
                : `🏆 Schaakmat! ${result.winner === 'w' ? 'Wit' : 'Zwart'} wint!`
              : result.status === 'stalemate'
                ? '🤝 Pat — remise! Niemand kan nog zetten.'
                : '🤝 Remise — te weinig materiaal om mat te zetten.'}
          </p>
          {mode === 'computer' ? (
            <HighscorePanel
              gameId={GAME_ID}
              profile={profile}
              score={finalScore}
              isRecord={isRecord}
              actionLabel="Nog eens spelen"
              onAction={() => setPhase('start')}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <BigButton variant="accent" onClick={() => setPhase('start')}>
                Nog eens spelen
              </BigButton>
            </div>
          )}
        </>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
