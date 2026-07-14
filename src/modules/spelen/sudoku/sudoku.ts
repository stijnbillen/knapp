// Sudokugenerator voor meerdere rastergroottes. Eerst wordt een volledige,
// geldige oplossing gebouwd (backtracking met geschudde kandidaten), daarna
// worden cellen weggehaald zolang de puzzel precies één oplossing houdt.

export interface GridConfig {
  size: number
  boxRows: number
  boxCols: number
}

export const GRIDS: GridConfig[] = [
  { size: 4, boxRows: 2, boxCols: 2 },
  { size: 6, boxRows: 2, boxCols: 3 },
  { size: 9, boxRows: 3, boxCols: 3 },
]

export type Grid = number[][] // 0 = leeg

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function emptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

export function canPlace(grid: Grid, conf: GridConfig, row: number, col: number, value: number): boolean {
  for (let i = 0; i < conf.size; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false
  }
  const br = Math.floor(row / conf.boxRows) * conf.boxRows
  const bc = Math.floor(col / conf.boxCols) * conf.boxCols
  for (let r = br; r < br + conf.boxRows; r++) {
    for (let c = bc; c < bc + conf.boxCols; c++) {
      if (grid[r][c] === value) return false
    }
  }
  return true
}

function fillGrid(grid: Grid, conf: GridConfig, pos: number): boolean {
  if (pos === conf.size * conf.size) return true
  const row = Math.floor(pos / conf.size)
  const col = pos % conf.size
  if (grid[row][col] !== 0) return fillGrid(grid, conf, pos + 1)
  for (const value of shuffle(Array.from({ length: conf.size }, (_, i) => i + 1))) {
    if (canPlace(grid, conf, row, col, value)) {
      grid[row][col] = value
      if (fillGrid(grid, conf, pos + 1)) return true
      grid[row][col] = 0
    }
  }
  return false
}

/** Telt oplossingen tot `limit` (vroeg stoppen houdt het snel). */
function countSolutions(grid: Grid, conf: GridConfig, limit: number): number {
  let row = -1
  let col = -1
  outer: for (let r = 0; r < conf.size; r++) {
    for (let c = 0; c < conf.size; c++) {
      if (grid[r][c] === 0) {
        row = r
        col = c
        break outer
      }
    }
  }
  if (row === -1) return 1

  let count = 0
  for (let value = 1; value <= conf.size; value++) {
    if (canPlace(grid, conf, row, col, value)) {
      grid[row][col] = value
      count += countSolutions(grid, conf, limit - count)
      grid[row][col] = 0
      if (count >= limit) return count
    }
  }
  return count
}

export interface SudokuPuzzle {
  puzzle: Grid
  solution: Grid
}

/**
 * Genereert een puzzel met (maximaal) `holes` lege cellen. Er worden enkel
 * cellen weggehaald zolang de oplossing uniek blijft.
 */
export function generateSudoku(conf: GridConfig, holes: number): SudokuPuzzle {
  const grid = emptyGrid(conf.size)
  fillGrid(grid, conf, 0)
  const solution = grid.map((r) => [...r])

  const cells = shuffle(
    Array.from({ length: conf.size * conf.size }, (_, i) => [Math.floor(i / conf.size), i % conf.size] as const),
  )
  let removed = 0
  for (const [r, c] of cells) {
    if (removed >= holes) break
    const backup = grid[r][c]
    grid[r][c] = 0
    if (countSolutions(grid.map((row) => [...row]), conf, 2) === 1) {
      removed++
    } else {
      grid[r][c] = backup
    }
  }

  return { puzzle: grid, solution }
}

/** Cellen die botsen met een andere cel in hun rij, kolom of blok. */
export function findConflicts(grid: Grid, conf: GridConfig): Set<string> {
  const conflicts = new Set<string>()
  for (let r = 0; r < conf.size; r++) {
    for (let c = 0; c < conf.size; c++) {
      const value = grid[r][c]
      if (value === 0) continue
      grid[r][c] = 0
      if (!canPlace(grid, conf, r, c, value)) conflicts.add(`${r}-${c}`)
      grid[r][c] = value
    }
  }
  return conflicts
}
