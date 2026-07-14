import { useMemo, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playClick, playPop, playStar } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'
import type { Grid, GridConfig } from '../../spelen/sudoku/sudoku'
import { GRIDS, findConflicts, generateSudoku } from '../../spelen/sudoku/sudoku'

const MODULE_ID = 'plaatjessudoku'

// Zes goed te onderscheiden figuurtjes; een 4×4 gebruikt de eerste vier.
const FIGUREN = ['🐸', '🍎', '⭐', '🦆', '🌸', '🚗']

const SIZES = [
  { label: '🐣 4×4', conf: GRIDS[0] },
  { label: '🐥 6×6', conf: GRIDS[1] },
]

// Aantal lege vakjes per moeilijkheid, per grootte (4×4, 6×6).
const LEVELS = [
  { label: '😌 Makkelijk', holes: [5, 10] },
  { label: '😈 Moeilijk', holes: [8, 16] },
]

type Phase = 'kies' | 'spelen'

export function PlaatjesSudokuModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('kies')
  const [sizeIndex, setSizeIndex] = useState(0)
  const [levelIndex, setLevelIndex] = useState(0)
  const [conf, setConf] = useState<GridConfig>(GRIDS[0])
  const [puzzle, setPuzzle] = useState<Grid | null>(null)
  const [grid, setGrid] = useState<Grid | null>(null)
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [won, setWon] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)

  const conflicts = useMemo(
    () => (grid ? findConflicts(grid, conf) : new Set<string>()),
    [grid, conf],
  )

  function start() {
    const chosenConf = SIZES[sizeIndex].conf
    const generated = generateSudoku(chosenConf, LEVELS[levelIndex].holes[sizeIndex])
    setConf(chosenConf)
    setPuzzle(generated.puzzle)
    setGrid(generated.puzzle.map((r) => [...r]))
    setSelected(null)
    setWon(false)
    setPhase('spelen')
  }

  function setCell(value: number) {
    if (!grid || !puzzle || !selected || won) return
    const { row, col } = selected
    if (puzzle[row][col] !== 0) return
    playClick()
    const next = grid.map((r) => [...r])
    next[row][col] = value
    setGrid(next)

    if (value !== 0 && next.every((r) => r.every((v) => v !== 0)) && findConflicts(next, conf).size === 0) {
      recordAnswer(profile.id, MODULE_ID, true)
      playStar()
      setStarTrigger((n) => n + 1)
      setWon(true)
    }
  }

  if (phase === 'kies') {
    return (
      <div className="screen">
        <BackHeader title="Sudoku" onBack={onExit} right={<StarCount profileId={profile.id} />} />

        <p style={{ textAlign: 'center', margin: '8px 0 16px' }}>
          Elk figuurtje mag maar één keer in elke rij, kolom en blok!
        </p>

        <div className="form-field">
          <label>Hoe groot?</label>
          <div className="picker-grid">
            {SIZES.map((s, i) => (
              <BigButton
                key={s.label}
                variant={i === sizeIndex ? 'accent' : 'soft'}
                onClick={() => setSizeIndex(i)}
              >
                {s.label}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Hoe moeilijk?</label>
          <div className="picker-grid">
            {LEVELS.map((l, i) => (
              <BigButton
                key={l.label}
                variant={i === levelIndex ? 'accent' : 'soft'}
                onClick={() => setLevelIndex(i)}
              >
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

  const thin = '1px solid #cfc9bb'
  const thick = '3px solid #7a6f5d'

  return (
    <div className="screen">
      <BackHeader
        title="Sudoku"
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton variant="ghost" onClick={() => setPhase('kies')} aria-label="Andere puzzel">
              ⚙️
            </BigButton>
          </div>
        }
      />

      {grid && puzzle && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${conf.size}, 1fr)`,
            width: 'min(90vw, 400px)',
            aspectRatio: '1',
            margin: '0 auto 14px',
            background: 'var(--surface)',
            borderRadius: 8,
            boxShadow: 'var(--shadow)',
            border: thick,
            userSelect: 'none',
          }}
        >
          {grid.map((rowCells, row) =>
            rowCells.map((value, col) => {
              const given = puzzle[row][col] !== 0
              const isSelected = selected?.row === row && selected?.col === col
              const conflict = conflicts.has(`${row}-${col}`)
              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => {
                    if (won) return
                    playPop()
                    setSelected(given ? null : { row, col })
                  }}
                  aria-label={value !== 0 ? FIGUREN[value - 1] : 'Leeg vakje'}
                  style={{
                    borderRight: (col + 1) % conf.boxCols === 0 ? thick : thin,
                    borderBottom: (row + 1) % conf.boxRows === 0 ? thick : thin,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: conf.size <= 4 ? '2.4rem' : '1.7rem',
                    lineHeight: 1,
                    background: conflict
                      ? 'var(--bad-soft)'
                      : isSelected
                        ? 'var(--accent-soft)'
                        : given
                          ? 'transparent'
                          : 'rgba(59, 127, 214, 0.05)',
                    outline: conflict ? '3px solid var(--bad)' : 'none',
                    outlineOffset: -3,
                  }}
                >
                  {value !== 0 ? FIGUREN[value - 1] : ''}
                </button>
              )
            }),
          )}
        </div>
      )}

      {!won && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {FIGUREN.slice(0, conf.size).map((emoji, i) => (
            <BigButton
              key={emoji}
              variant="soft"
              style={{ fontSize: '1.8rem', minWidth: 60, minHeight: 60 }}
              onClick={() => setCell(i + 1)}
              disabled={!selected}
              aria-label={`Figuurtje ${emoji}`}
            >
              {emoji}
            </BigButton>
          ))}
          <BigButton
            variant="ghost"
            style={{ minWidth: 60, minHeight: 60, fontSize: '1.3rem' }}
            onClick={() => setCell(0)}
            disabled={!selected}
            aria-label="Wissen"
          >
            ⌫
          </BigButton>
        </div>
      )}

      {won && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🐸🎉</span>
          <div>Alle figuurtjes staan juist, knap gedaan!</div>
          <BigButton variant="accent" onClick={start}>
            Nog een puzzel
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
