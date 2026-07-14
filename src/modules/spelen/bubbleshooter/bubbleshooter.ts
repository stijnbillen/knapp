// Zuivere rasterlogica voor Bubble Shooter: zeshoekige pakking (offset-rijen).
// Enkel rij/kolom-topologie, geen pixels — die rekent de component zelf uit
// (analoog aan Galaxia, die canvas-breedte/hoogte pas in de render-loop kent).

export const COLS = 8
export const HUES = [0, 72, 144, 216, 288]

export type Grid = Map<string, number> // key `${row},${col}` -> kleurindex (index in HUES)

export function key(row: number, col: number): string {
  return `${row},${col}`
}

/** Even rijen hebben COLS bubbels, oneven rijen (naar rechts verschoven) één minder. */
export function colsForRow(row: number): number {
  return row % 2 === 0 ? COLS : COLS - 1
}

export function neighborsOf(row: number, col: number): [number, number][] {
  if (row % 2 === 0) {
    return [
      [row, col - 1],
      [row, col + 1],
      [row - 1, col - 1],
      [row - 1, col],
      [row + 1, col - 1],
      [row + 1, col],
    ]
  }
  return [
    [row, col - 1],
    [row, col + 1],
    [row - 1, col],
    [row - 1, col + 1],
    [row + 1, col],
    [row + 1, col + 1],
  ]
}

export function validCell(row: number, col: number): boolean {
  return row >= 0 && col >= 0 && col < colsForRow(row)
}

/** Verbonden groep van dezelfde kleur, startend bij (row,col) (die zelf al in de grid moet staan). */
export function floodFillSameColor(grid: Grid, row: number, col: number): Set<string> {
  const color = grid.get(key(row, col))
  if (color === undefined) return new Set()
  const seen = new Set<string>([key(row, col)])
  const stack: [number, number][] = [[row, col]]
  while (stack.length) {
    const [r, c] = stack.pop()!
    for (const [nr, nc] of neighborsOf(r, c)) {
      const k = key(nr, nc)
      if (seen.has(k) || !validCell(nr, nc)) continue
      if (grid.get(k) === color) {
        seen.add(k)
        stack.push([nr, nc])
      }
    }
  }
  return seen
}

/** Bubbels die niet (via een keten) verbonden zijn met rij 0 vallen naar beneden. */
export function findFloating(grid: Grid, rowCount: number): Set<string> {
  const anchored = new Set<string>()
  const stack: [number, number][] = []
  for (let c = 0; c < colsForRow(0); c++) {
    if (grid.has(key(0, c))) {
      anchored.add(key(0, c))
      stack.push([0, c])
    }
  }
  while (stack.length) {
    const [r, c] = stack.pop()!
    for (const [nr, nc] of neighborsOf(r, c)) {
      const k = key(nr, nc)
      if (anchored.has(k) || !validCell(nr, nc) || !grid.has(k)) continue
      anchored.add(k)
      stack.push([nr, nc])
    }
  }
  const floating = new Set<string>()
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colsForRow(r); c++) {
      const k = key(r, c)
      if (grid.has(k) && !anchored.has(k)) floating.add(k)
    }
  }
  return floating
}

export function randomStartGrid(rowCount: number, paletteSize: number): Grid {
  const grid: Grid = new Map()
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colsForRow(r); c++) {
      grid.set(key(r, c), Math.floor(Math.random() * paletteSize))
    }
  }
  return grid
}

export function pickColor(grid: Grid, paletteSize: number): number {
  const present = new Set(grid.values())
  if (present.size === 0) return Math.floor(Math.random() * paletteSize)
  const options = [...present]
  return options[Math.floor(Math.random() * options.length)]
}
