// Zuivere logica voor de woordzoeker: woorden in 8 richtingen in een
// letterrooster plaatsen, en een sleepselectie tegen de geplaatste woorden
// controleren.

export const DIRS: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const ALFABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export interface Placement {
  woord: string
  cells: [number, number][]
}

export interface Puzzle {
  size: number
  grid: string[][]
  placements: Placement[]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function startRange(delta: number, size: number, length: number): [number, number] {
  if (delta === 1) return [0, size - length]
  if (delta === -1) return [length - 1, size - 1]
  return [0, size - 1]
}

/** Genereert een letterrooster met `woorden` erin verstopt (indien mogelijk). */
export function generatePuzzle(size: number, woorden: string[]): Puzzle {
  const grid: string[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => ''))
  const placements: Placement[] = []
  const gesorteerd = [...woorden].sort((a, b) => b.length - a.length)

  for (const woordRuw of gesorteerd) {
    const woord = woordRuw.toUpperCase()
    if (woord.length > size) continue
    let placed = false
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const [dr, dc] = DIRS[randomInt(0, DIRS.length - 1)]
      const [rowMin, rowMax] = startRange(dr, size, woord.length)
      const [colMin, colMax] = startRange(dc, size, woord.length)
      if (rowMin > rowMax || colMin > colMax) continue
      const row0 = randomInt(rowMin, rowMax)
      const col0 = randomInt(colMin, colMax)

      let past = true
      const cells: [number, number][] = []
      for (let i = 0; i < woord.length; i++) {
        const r = row0 + dr * i
        const c = col0 + dc * i
        const bestaand = grid[r][c]
        if (bestaand !== '' && bestaand !== woord[i]) {
          past = false
          break
        }
        cells.push([r, c])
      }
      if (!past) continue

      cells.forEach(([r, c], i) => {
        grid[r][c] = woord[i]
      })
      placements.push({ woord, cells })
      placed = true
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') grid[r][c] = ALFABET[randomInt(0, ALFABET.length - 1)]
    }
  }

  return { size, grid, placements }
}

/** Rechte lijn van cellen tussen start en (gesnapt) doel, via de dichtstbijzijnde van de 8 richtingen. */
export function lineBetween(start: [number, number], target: [number, number]): [number, number][] {
  const [sr, sc] = start
  const [tr, tc] = target
  const dr = tr - sr
  const dc = tc - sc
  if (dr === 0 && dc === 0) return [start]

  const len = Math.hypot(dr, dc)
  let best: [number, number] = DIRS[0]
  let bestDot = -Infinity
  for (const [ddr, ddc] of DIRS) {
    const dot = (dr * ddr + dc * ddc) / Math.hypot(ddr, ddc)
    if (dot > bestDot) {
      bestDot = dot
      best = [ddr, ddc]
    }
  }
  const steps = Math.round(len / Math.hypot(best[0], best[1]))
  const cells: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    cells.push([sr + best[0] * i, sc + best[1] * i])
  }
  return cells
}

export function cellsToWord(grid: string[][], cells: [number, number][]): string {
  return cells.map(([r, c]) => grid[r]?.[c] ?? '').join('')
}

function reverse<T>(list: T[]): T[] {
  return [...list].reverse()
}

/** Zoekt of de geselecteerde cellen (voor- of achterwaarts) een nog niet gevonden woord vormen. */
export function matchSelection(
  puzzle: Puzzle,
  cells: [number, number][],
  gevonden: Set<string>,
): Placement | null {
  const woord = cellsToWord(puzzle.grid, cells)
  const woordAchterwaarts = cellsToWord(puzzle.grid, reverse(cells))
  for (const p of puzzle.placements) {
    if (gevonden.has(p.woord)) continue
    if (p.woord === woord || p.woord === woordAchterwaarts) return p
  }
  return null
}
