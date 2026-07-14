import { useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { playClick, playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { StarBurst } from '../../../ui/StarBurst'

// Grote emoji-pool: dieren, eten, voertuigen, smileys, planten en bomen,
// zon en maan, een berg, speelgoed en dino's.
const EMOJI_POOL = [
  '🍎', '🍌', '🍇', '🍓', '🐶', '🐱', '🐸', '🦆', '⭐', '🌸',
  '⚽', '🎈', '🚗', '🐟', '🦋', '🌳', '🍄', '⛵', '🎁', '🧸',
  '😀', '😉', '😊', '😍', '🤪', '😎', '🥳', '😴', '😭', '😡',
  '🌲', '🌴', '🌵', '🌷', '🌻', '🌹', '🍀', '🌿', '🎄', '🌾',
  '☀️', '🌙', '⛰️',
  '🪁', '🎲', '🪀', '🎯', '🎳', '🪆', '🛹', '🛴',
  '🦖', '🦕', '🐉',
  '🐼', '🦊', '🐰', '🦁', '🐧', '🐳', '🐙', '🦄', '🐢', '🐝',
  '🐞', '🦉', '🐷', '🐮', '🐵',
]

const BOARDS = [
  { label: '🐣 Klein (4×4)', cols: 4, rows: 4 },
  { label: '🙂 Middel (6×6)', cols: 6, rows: 6 },
  { label: '😅 Groot (8×8)', cols: 8, rows: 8 },
  { label: '🤯 Reuze (10×10)', cols: 10, rows: 10 },
]

const PLAYER_ICONS = ['🦊', '🐼', '🐸', '🦄']

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Card {
  emoji: string
  matched: boolean
}

type Phase = 'kies' | 'spelen'

export function MemoryModule({ onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('kies')
  const [boardIndex, setBoardIndex] = useState(0)
  const [playerCount, setPlayerCount] = useState(2)
  const [cols, setCols] = useState(4)
  const [cards, setCards] = useState<Card[]>([])
  const [open, setOpen] = useState<number[]>([]) // indexen van omgedraaide kaarten (max 2)
  const [scores, setScores] = useState<number[]>([])
  const [turn, setTurn] = useState(0)
  const [won, setWon] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)
  const lock = useRef(false)

  function start() {
    const board = BOARDS[boardIndex]
    const pairCount = (board.cols * board.rows) / 2
    const emojis = shuffle(EMOJI_POOL).slice(0, pairCount)
    setCols(board.cols)
    setCards(shuffle([...emojis, ...emojis]).map((emoji) => ({ emoji, matched: false })))
    setOpen([])
    setScores(Array(playerCount).fill(0))
    setTurn(0)
    setWon(false)
    lock.current = false
    setPhase('spelen')
  }

  function flip(index: number) {
    if (lock.current || won) return
    if (cards[index].matched || open.includes(index)) return

    playClick()
    const nextOpen = [...open, index]
    setOpen(nextOpen)
    if (nextOpen.length < 2) return

    const [a, b] = nextOpen
    if (cards[a].emoji === cards[b].emoji) {
      // Paar gevonden: blijft open, zelfde speler mag opnieuw
      const nextCards = cards.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c))
      const nextScores = scores.map((s, i) => (i === turn ? s + 1 : s))
      setCards(nextCards)
      setScores(nextScores)
      setOpen([])
      if (nextCards.every((c) => c.matched)) {
        playStar()
        setStarTrigger((n) => n + 1)
        setWon(true)
      } else {
        playPop()
      }
    } else {
      // Geen paar: even tonen, dan terugdraaien en beurt doorgeven
      lock.current = true
      setTimeout(() => {
        playWrong()
        setOpen([])
        setTurn((t) => (t + 1) % playerCount)
        lock.current = false
      }, 900)
    }
  }

  if (phase === 'kies') {
    return (
      <div className="screen">
        <BackHeader title="Memory" onBack={onExit} />

        <div className="form-field">
          <label>Hoeveel spelers?</label>
          <div className="picker-grid">
            {[1, 2, 3, 4].map((n) => (
              <BigButton
                key={n}
                variant={n === playerCount ? 'accent' : 'soft'}
                onClick={() => setPlayerCount(n)}
              >
                {PLAYER_ICONS.slice(0, n).join('')} {n}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Hoe groot is het bord?</label>
          <div className="picker-grid">
            {BOARDS.map((b, i) => (
              <BigButton
                key={b.label}
                variant={i === boardIndex ? 'accent' : 'soft'}
                onClick={() => setBoardIndex(i)}
              >
                {b.label}
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

  const cellSize = `min(90vw, 420px) / ${cols}`
  const best = Math.max(...scores)
  const winners = scores
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s === best)
    .map((x) => PLAYER_ICONS[x.i])

  return (
    <div className="screen">
      <BackHeader
        title="Memory"
        onBack={onExit}
        right={
          <BigButton variant="ghost" onClick={() => setPhase('kies')} aria-label="Ander spel">
            ⚙️
          </BigButton>
        }
      />

      {/* Scorebord: actieve speler licht op */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
        {scores.map((score, i) => (
          <span
            key={i}
            className="star-count"
            style={{
              background: i === turn && !won ? 'var(--accent)' : 'var(--surface)',
              color: i === turn && !won ? 'white' : 'inherit',
            }}
          >
            {PLAYER_ICONS[i]} {score}
          </span>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 4,
          width: 'min(90vw, 420px)',
          margin: '0 auto',
          userSelect: 'none',
        }}
      >
        {cards.map((card, i) => {
          const visible = card.matched || open.includes(i)
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={visible ? card.emoji : 'Omgedraaide kaart'}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                fontSize: `calc(${cellSize} * 0.6)`,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: card.matched
                  ? 'var(--good-soft)'
                  : visible
                    ? 'var(--surface)'
                    : 'var(--accent)',
                boxShadow: 'var(--shadow)',
                transition: 'background 0.15s ease',
              }}
            >
              {visible ? card.emoji : ''}
            </button>
          )
        })}
      </div>

      {won && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🎉</span>
          <div>
            {playerCount === 1 ? (
              <span>Alle paren gevonden, knap gedaan!</span>
            ) : winners.length > 1 ? (
              <span>
                Gelijkspel tussen {winners.join(' en ')} met <strong>{best}</strong> paren!
              </span>
            ) : (
              <span>
                {winners[0]} wint met <strong>{best}</strong> paren!
              </span>
            )}
          </div>
          <BigButton variant="accent" onClick={start}>
            Nog eens spelen
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
