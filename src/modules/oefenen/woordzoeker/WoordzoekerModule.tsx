import { useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playClick, playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'
import type { Puzzle } from './woordzoeker'
import { generatePuzzle, lineBetween, matchSelection } from './woordzoeker'
import THEMAS_RAW from './woordzoeker-woorden.json'

const MODULE_ID = 'woordzoeker'

interface Thema {
  id: string
  label: string
  woorden: string[]
}

const THEMAS = THEMAS_RAW as Thema[]

const LEVELS = [
  { label: '😌 Klein', size: 8, aantal: 6 },
  { label: '🙂 Middel', size: 10, aantal: 8 },
  { label: '😈 Groot', size: 12, aantal: 10 },
]

const KLEUREN = ['#ffd166', '#a0e7a0', '#8ecae6', '#f7b2ad', '#c8b6ff', '#ffb4a2', '#b9fbc0', '#90dbf4', '#fdffb6', '#ffc6ff']

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickWoorden(thema: Thema, aantal: number, size: number): string[] {
  const passend = thema.woorden.filter((w) => w.length <= size)
  return shuffle(passend).slice(0, Math.min(aantal, passend.length))
}

function keyOf(r: number, c: number): string {
  return `${r},${c}`
}

type Phase = 'instellen' | 'spelen'

export function WoordzoekerModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('instellen')
  const [themaIndex, setThemaIndex] = useState(0)
  const [levelIndex, setLevelIndex] = useState(0)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [gevonden, setGevonden] = useState<Set<string>>(new Set())
  const [gevondenKleur, setGevondenKleur] = useState<Map<string, string>>(new Map())
  const [selectie, setSelectie] = useState<[number, number][]>([])
  const [foutFlash, setFoutFlash] = useState(false)
  const [klaar, setKlaar] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<[number, number] | null>(null)

  function start() {
    const thema = THEMAS[themaIndex]
    const level = LEVELS[levelIndex]
    const woorden = pickWoorden(thema, level.aantal, level.size)
    setPuzzle(generatePuzzle(level.size, woorden))
    setGevonden(new Set())
    setGevondenKleur(new Map())
    setSelectie([])
    setKlaar(false)
    startRef.current = null
    setPhase('spelen')
  }

  function cellFromEvent(e: { clientX: number; clientY: number }): [number, number] | null {
    if (!containerRef.current || !puzzle) return null
    const rect = containerRef.current.getBoundingClientRect()
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * puzzle.size)
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * puzzle.size)
    if (row < 0 || col < 0 || row >= puzzle.size || col >= puzzle.size) return null
    return [row, col]
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!puzzle || klaar) return
    const cell = cellFromEvent(e)
    if (!cell) return
    startRef.current = cell
    setSelectie([cell])
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!puzzle || !startRef.current) return
    const cell = cellFromEvent(e)
    if (!cell) return
    setSelectie(lineBetween(startRef.current, cell))
  }

  function onPointerUp() {
    if (!puzzle || !startRef.current || selectie.length === 0) {
      startRef.current = null
      return
    }
    const match = matchSelection(puzzle, selectie, gevonden)
    if (match) {
      playCorrect()
      const kleur = KLEUREN[gevonden.size % KLEUREN.length]
      setGevondenKleur((m) => {
        const next = new Map(m)
        for (const [r, c] of match.cells) next.set(keyOf(r, c), kleur)
        return next
      })
      const nextGevonden = new Set(gevonden).add(match.woord)
      setGevonden(nextGevonden)
      if (nextGevonden.size === puzzle.placements.length) {
        recordAnswer(profile, MODULE_ID, true)
        setStarTrigger((n) => n + 1)
        setKlaar(true)
      }
    } else if (selectie.length > 1) {
      playWrong()
      setFoutFlash(true)
      setTimeout(() => setFoutFlash(false), 300)
    } else {
      playClick()
    }
    startRef.current = null
    setSelectie([])
  }

  if (phase === 'instellen' || !puzzle) {
    return (
      <div className="screen">
        <BackHeader title="Woordzoeker" onBack={onExit} />

        <div className="form-field">
          <label>Welk thema?</label>
          <div className="picker-grid">
            {THEMAS.map((t, i) => (
              <BigButton key={t.id} variant={i === themaIndex ? 'accent' : 'soft'} onClick={() => setThemaIndex(i)}>
                {t.label}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Hoe groot?</label>
          <div className="picker-grid">
            {LEVELS.map((l, i) => (
              <BigButton key={l.label} variant={i === levelIndex ? 'accent' : 'soft'} onClick={() => setLevelIndex(i)}>
                {l.label}
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

  const selectieSet = new Set(selectie.map(([r, c]) => keyOf(r, c)))
  const cellFont = puzzle.size <= 8 ? '1.2rem' : puzzle.size <= 10 ? '1rem' : '0.85rem'

  return (
    <div className="screen">
      <BackHeader
        title="Woordzoeker"
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton variant="ghost" onClick={() => setPhase('instellen')} aria-label="Instellingen">
              ⚙️
            </BigButton>
          </div>
        }
      />

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
          width: 'min(92vw, 420px)',
          aspectRatio: '1',
          margin: '0 auto 16px',
          background: foutFlash ? 'var(--bad-soft)' : 'var(--surface)',
          borderRadius: 8,
          boxShadow: 'var(--shadow)',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {puzzle.grid.map((rowLetters, r) =>
          rowLetters.map((letter, c) => {
            const k = keyOf(r, c)
            const gevondenKleurWaarde = gevondenKleur.get(k)
            const isSelected = selectieSet.has(k)
            return (
              <div
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: cellFont,
                  fontWeight: 700,
                  borderRadius: 4,
                  background: gevondenKleurWaarde ?? (isSelected ? 'var(--accent-soft)' : 'transparent'),
                }}
              >
                {letter}
              </div>
            )
          }),
        )}
      </div>

      {!klaar && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {puzzle.placements.map((p) => (
            <span
              key={p.woord}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: gevonden.has(p.woord) ? 'var(--good-soft)' : 'var(--surface)',
                boxShadow: 'var(--shadow)',
                textDecoration: gevonden.has(p.woord) ? 'line-through' : 'none',
                opacity: gevonden.has(p.woord) ? 0.6 : 1,
                fontWeight: 700,
              }}
            >
              {p.woord}
            </span>
          ))}
        </div>
      )}

      {klaar && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🔍🎉</span>
          <div>Alle woorden gevonden, knap gedaan!</div>
          <BigButton variant="accent" onClick={start}>
            Nieuwe woordzoeker
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
