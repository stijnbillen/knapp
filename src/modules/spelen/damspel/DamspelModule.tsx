import { useEffect, useMemo, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playClick, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'
import { StarBurst } from '../../../ui/StarBurst'
import type { Board, Color, GameState } from './draughts'
import {
  aiChooseMove,
  applyMove,
  demoMoves,
  emptyBoard,
  initialGameState,
  isGameOver,
  kingCaptureDemo,
  legalMovesForSquare,
  manCaptureDemo,
  squareIndex,
  winnerColor,
} from './draughts'

const GAME_ID = 'damspel'

// De officiële damschijf-symbolen (⛀⛁⛂⛃) hebben op veel systemen geen
// leesbare fontondersteuning — een gekleurde schijf tekent overal identiek.
function DiscIcon({ color, type, size }: { color: Color; type: 'M' | 'D'; size: number }) {
  const isWhite = color === 'w'
  return (
    <div
      style={{
        width: '78%',
        height: '78%',
        borderRadius: '50%',
        background: isWhite ? '#f5f0e6' : '#2b2b2b',
        border: `2px solid ${isWhite ? '#b0a89a' : '#000'}`,
        boxShadow: 'inset 0 -3px 5px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        color: isWhite ? '#c8960c' : '#ffd54a',
        lineHeight: 1,
      }}
    >
      {type === 'D' ? '♛' : ''}
    </div>
  )
}

type Lang = 'nl' | 'fr'
type Diagram = 'opstelling' | 'man' | 'dam' | 'slaan-man' | 'slaan-dam' | 'winnen'

interface Topic {
  id: Diagram
  icon: string
  nl: { titel: string; tekst: string }
  fr: { titel: string; tekst: string }
}

const TOPICS: Topic[] = [
  {
    id: 'opstelling',
    icon: '🏁',
    nl: {
      titel: 'Opstelling',
      tekst:
        'Elke speler heeft 20 schijven, opgesteld op de donkere velden van de vier rijen aan zijn eigen kant. Wit staat onderaan, zwart bovenaan.',
    },
    fr: {
      titel: 'Mise en place',
      tekst:
        "Chaque joueur a 20 pions, placés sur les cases sombres des quatre rangées de son côté. Les blancs sont en bas, les noirs en haut.",
    },
  },
  {
    id: 'man',
    icon: '⚪',
    nl: {
      titel: 'Een schijf zetten',
      tekst: 'Een gewone schijf (een "man") mag telkens één stap schuin vooruit zetten, naar een leeg veld.',
    },
    fr: {
      titel: 'Déplacer un pion',
      tekst: "Un pion simple avance en diagonale, d'une case à la fois, vers une case vide.",
    },
  },
  {
    id: 'slaan-man',
    icon: '💥',
    nl: {
      titel: 'Slaan (verplicht!)',
      tekst:
        'Staat een schijf van je tegenstander schuin naast jouw schijf, en is het veld erachter leeg? Dan MOET je erover springen en die schijf slaan — ook achterwaarts. Kan je na die sprong meteen nog een schijf slaan? Dan moet dat ook, met dezelfde schijf!',
    },
    fr: {
      titel: 'La prise (obligatoire !)',
      tekst:
        "Si un pion adverse se trouve en diagonale juste à côté du vôtre, et que la case juste derrière est vide, vous DEVEZ sauter par-dessus et le capturer — même vers l'arrière. Si une nouvelle prise est possible juste après, avec le même pion, elle est obligatoire aussi !",
    },
  },
  {
    id: 'dam',
    icon: '👑',
    nl: {
      titel: 'Dam worden',
      tekst:
        'Bereikt jouw schijf de laatste rij, helemaal aan de overkant? Dan wordt hij een dam! Een dam mag zo ver hij wil schuin bewegen, in alle vier de richtingen.',
    },
    fr: {
      titel: 'Devenir une dame',
      tekst:
        "Si votre pion atteint la dernière rangée, tout au bout du plateau, il devient une dame ! Une dame peut se déplacer aussi loin qu'elle veut en diagonale, dans les quatre directions.",
    },
  },
  {
    id: 'slaan-dam',
    icon: '⚡',
    nl: {
      titel: 'Een dam laten slaan',
      tekst:
        'Een dam mag van ver aanlopen, over een schijf van de tegenstander springen, en dan zelf kiezen hoe ver hij daarna landt — zolang die velden leeg zijn.',
    },
    fr: {
      titel: 'La prise avec une dame',
      tekst:
        "Une dame peut prendre de l'élan de loin, sauter par-dessus un pion adverse, puis choisir elle-même où atterrir ensuite — tant que ces cases sont vides.",
    },
  },
  {
    id: 'winnen',
    icon: '🏆',
    nl: {
      titel: 'Winnen',
      tekst:
        'Je wint als de tegenstander geen enkele zet meer kan doen. Meestal omdat hij geen schijven meer over heeft, of omdat ze allemaal vastzitten.',
    },
    fr: {
      titel: 'Gagner la partie',
      tekst:
        "Vous gagnez quand l'adversaire ne peut plus faire aucun coup — le plus souvent parce qu'il n'a plus de pions, ou qu'ils sont tous bloqués.",
    },
  },
]

type Phase = 'start' | 'uitleg' | 'playing' | 'done'
type Mode = 'computer' | 'twee'

function miniBoard(board: Board, targets: number[] = []) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        width: 'min(80vw, 320px)',
        aspectRatio: '1',
        margin: '0 auto',
        boxShadow: 'var(--shadow)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {board.map((cell, i) => {
        const row = Math.floor(i / 10)
        const col = i % 10
        const dark = (row + col) % 2 === 1
        return (
          <div
            key={i}
            style={{
              background: dark ? '#b58863' : '#f0ead6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              fontSize: '1.2rem',
            }}
          >
            {cell && <DiscIcon color={cell.color} type={cell.type} size={32} />}
            {targets.includes(i) && (
              <span
                style={{
                  position: 'absolute',
                  width: '26%',
                  height: '26%',
                  borderRadius: '50%',
                  background: 'rgba(59, 127, 214, 0.6)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function diagramFor(id: Diagram): { board: Board; targets: number[] } {
  if (id === 'opstelling') return { board: initialGameState().board, targets: [] }
  if (id === 'man') {
    const board = emptyBoard()
    const from = squareIndex(5, 4)
    board[from] = { type: 'M', color: 'w' }
    return { board, targets: demoMoves(board, from) }
  }
  if (id === 'dam') {
    const board = emptyBoard()
    const from = squareIndex(5, 4)
    board[from] = { type: 'D', color: 'w' }
    return { board, targets: demoMoves(board, from) }
  }
  if (id === 'slaan-man') {
    const d = manCaptureDemo()
    return { board: d.board, targets: d.targets }
  }
  if (id === 'slaan-dam') {
    const d = kingCaptureDemo()
    return { board: d.board, targets: d.targets }
  }
  return { board: emptyBoard(), targets: [] }
}

interface Result {
  winner: Color
}

export function DamspelModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [mode, setMode] = useState<Mode>('computer')
  const [level, setLevel] = useState<1 | 2>(1)
  const [lang, setLang] = useState<Lang>('nl')
  const [topic, setTopic] = useState<Diagram>('opstelling')
  const [state, setState] = useState<GameState>(() => initialGameState())
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [finalScore, setFinalScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)

  const activeFrom = state.forcedFrom ?? selected
  const legalTargets = useMemo(
    () => (activeFrom !== null ? legalMovesForSquare(state, activeFrom).map((m) => m.to) : []),
    [state, activeFrom],
  )

  useEffect(() => {
    if (state.forcedFrom != null) setSelected(state.forcedFrom)
  }, [state.forcedFrom])

  function finishGame(winner: Color) {
    setResult({ winner })
    setPhase('done')
    if (mode === 'computer') {
      if (winner === 'w') {
        playStar()
        setStarTrigger((n) => n + 1)
        const score = 20 * level
        setFinalScore(score)
        setIsRecord(submitScore(GAME_ID, profile, score))
      } else {
        playWrong()
      }
    } else {
      playStar()
      setStarTrigger((n) => n + 1)
    }
  }

  useEffect(() => {
    if (phase !== 'playing') return
    if (isGameOver(state)) finishGame(winnerColor(state))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state])

  useEffect(() => {
    if (phase !== 'playing' || mode !== 'computer' || state.turn !== 'b') return
    if (isGameOver(state)) return
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
    setResult(null)
    setFinalScore(0)
    setIsRecord(false)
    setPhase('playing')
  }

  function tapSquare(index: number) {
    if (phase !== 'playing') return
    if (mode === 'computer' && state.turn === 'b') return
    const piece = state.board[index]

    if (activeFrom !== null) {
      const move = legalMovesForSquare(state, activeFrom).find((m) => m.to === index)
      if (move) {
        playClick()
        setState((s) => applyMove(s, move))
        setSelected(null)
        return
      }
      if (state.forcedFrom == null && piece && piece.color === state.turn) {
        setSelected(index)
        return
      }
      if (state.forcedFrom == null) setSelected(null)
      return
    }
    if (piece && piece.color === state.turn) setSelected(index)
  }

  if (phase === 'start') {
    return (
      <div className="screen">
        <BackHeader title="Dammen" onBack={onExit} />
        <p style={{ textAlign: 'center', margin: '8px 0 16px' }}>⛃ Sla alle schijven van je tegenstander!</p>

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
            ❓ Hoe werkt dammen?
          </BigButton>
        </div>
      </div>
    )
  }

  if (phase === 'uitleg') {
    const t = TOPICS.find((x) => x.id === topic)!
    const { board, targets } = diagramFor(topic)
    const text = lang === 'nl' ? t.nl : t.fr

    return (
      <div className="screen">
        <BackHeader title={lang === 'nl' ? 'Hoe werkt dammen?' : 'Comment jouer aux dames ?'} onBack={() => setPhase('start')} />

        <div className="picker-grid" style={{ marginBottom: 8 }}>
          <BigButton variant={lang === 'nl' ? 'accent' : 'soft'} onClick={() => setLang('nl')}>
            🇳🇱 Nederlands
          </BigButton>
          <BigButton variant={lang === 'fr' ? 'accent' : 'soft'} onClick={() => setLang('fr')}>
            🇫🇷 Français
          </BigButton>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', margin: '8px 0 16px' }}>
          {TOPICS.map((x) => (
            <BigButton
              key={x.id}
              variant={x.id === topic ? 'accent' : 'soft'}
              style={{ fontSize: '1.4rem', minWidth: 52 }}
              onClick={() => setTopic(x.id)}
            >
              {x.icon}
            </BigButton>
          ))}
        </div>

        {topic !== 'winnen' ? miniBoard(board, targets) : <p style={{ textAlign: 'center', fontSize: '5rem' }}>🏆</p>}

        <p style={{ textAlign: 'center', fontWeight: 700, margin: '16px 0 4px' }}>{text.titel}</p>
        <p style={{ textAlign: 'center', color: 'var(--text-soft)', maxWidth: 360, margin: '0 auto' }}>{text.tekst}</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader
        title="Dammen"
        onBack={onExit}
        right={
          phase === 'playing' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="star-count">
                {state.turn === 'w' ? '⚪' : '⚫'} aan zet{state.forcedFrom != null ? ' · Moet doorslaan!' : ''}
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
              gridTemplateColumns: 'repeat(10, 1fr)',
              width: 'min(92vw, 440px)',
              aspectRatio: '1',
              margin: '0 auto',
              boxShadow: 'var(--shadow)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {state.board.map((cell, i) => {
              const row = Math.floor(i / 10)
              const col = i % 10
              const dark = (row + col) % 2 === 1
              const isSelected = activeFrom === i
              const isTarget = legalTargets.includes(i)
              return (
                <button
                  key={i}
                  disabled={!dark}
                  onClick={() => tapSquare(i)}
                  aria-label={cell ? `${cell.color === 'w' ? 'wit' : 'zwart'} ${cell.type === 'D' ? 'dam' : 'man'}` : 'Leeg veld'}
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : dark ? '#b58863' : '#f0ead6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: '1.7rem',
                    lineHeight: 1,
                  }}
                >
                  {cell && <DiscIcon color={cell.color} type={cell.type} size={44} />}
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
                </button>
              )
            })}
          </div>

          {mode === 'computer' && state.turn === 'b' && (
            <p style={{ textAlign: 'center', color: 'var(--text-soft)', marginTop: 8 }}>De computer denkt na…</p>
          )}
        </>
      )}

      {phase === 'done' && result && (
        <>
          <p style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, margin: '16px 0 0' }}>
            {mode === 'computer'
              ? result.winner === 'w'
                ? '🏆 Jij wint! Alle schijven van de computer zijn vast of op.'
                : '😅 De computer wint deze keer.'
              : `🏆 ${result.winner === 'w' ? 'Wit' : 'Zwart'} wint!`}
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
