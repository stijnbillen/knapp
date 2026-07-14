import { useMemo, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { playClick, playPop, playStar } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { StarBurst } from '../../../ui/StarBurst'
import type { Grid, GridConfig } from './sudoku'
import { GRIDS, findConflicts, generateSudoku } from './sudoku'

const GRID_LABELS = ['🐣 4×4', '🐥 6×6', '🦉 9×9']

// Aantal lege cellen per moeilijkheid, per rastergrootte.
const LEVELS = [
  { label: '😌 Makkelijk', holes: [6, 12, 36] },
  { label: '🙂 Middel', holes: [8, 18, 45] },
  { label: '😈 Moeilijk', holes: [10, 22, 53] },
]

type Phase = 'kies' | 'spelen'

export function SudokuModule({ onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('kies')
  const [gridIndex, setGridIndex] = useState(0)
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
    const chosenConf = GRIDS[gridIndex]
    const generated = generateSudoku(chosenConf, LEVELS[levelIndex].holes[gridIndex])
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
    if (puzzle[row][col] !== 0) return // gegeven cijfer, niet aanpasbaar
    playClick()
    const next = grid.map((r) => [...r])
    next[row][col] = value
    setGrid(next)

    // Winst: alles ingevuld zonder botsingen
    if (value !== 0 && next.every((r) => r.every((v) => v !== 0)) && findConflicts(next, conf).size === 0) {
      playStar()
      setStarTrigger((n) => n + 1)
      setWon(true)
    }
  }

  if (phase === 'kies') {
    return (
      <div className="screen">
        <BackHeader title="Sudoku" onBack={onExit} />

        <div className="form-field">
          <label>Hoe groot?</label>
          <div className="picker-grid">
            {GRIDS.map((g, i) => (
              <BigButton
                key={g.size}
                variant={i === gridIndex ? 'accent' : 'soft'}
                onClick={() => setGridIndex(i)}
              >
                {GRID_LABELS[i]}
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

  const cellFont = conf.size <= 4 ? '1.8rem' : conf.size <= 6 ? '1.4rem' : '1.1rem'
  const thin = '1px solid #cfc9bb'
  const thick = '3px solid #7a6f5d'

  return (
    <div className="screen">
      <BackHeader
        title="Sudoku"
        onBack={onExit}
        right={
          <BigButton variant="ghost" onClick={() => setPhase('kies')} aria-label="Andere puzzel">
            ⚙️
          </BigButton>
        }
      />

      {grid && puzzle && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${conf.size}, 1fr)`,
            width: 'min(90vw, 420px)',
            aspectRatio: '1',
            margin: '0 auto 12px',
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
                  style={{
                    borderRight: (col + 1) % conf.boxCols === 0 ? thick : thin,
                    borderBottom: (row + 1) % conf.boxRows === 0 ? thick : thin,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: cellFont,
                    fontWeight: given ? 800 : 600,
                    color: conflict ? '#d33' : given ? 'var(--text)' : 'var(--accent)',
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                    lineHeight: 1,
                  }}
                >
                  {value !== 0 ? value : ''}
                </button>
              )
            }),
          )}
        </div>
      )}

      {!won && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            maxWidth: 420,
            margin: '0 auto',
          }}
        >
          {Array.from({ length: conf.size }, (_, i) => i + 1).map((n) => (
            <BigButton
              key={n}
              variant="soft"
              style={{ minWidth: 52, fontSize: '1.3rem' }}
              onClick={() => setCell(n)}
              disabled={!selected}
            >
              {n}
            </BigButton>
          ))}
          <BigButton
            variant="ghost"
            style={{ minWidth: 52, fontSize: '1.2rem' }}
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
          <span className="feedback-panel__emoji">🧩🎉</span>
          <div>Sudoku opgelost, knap gedaan!</div>
          <BigButton variant="accent" onClick={start}>
            Nog een sudoku
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
