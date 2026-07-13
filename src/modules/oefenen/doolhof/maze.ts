// Doolhofgenerator via recursive backtracking (iteratief met een stapel).
// Elke cel houdt bij welke muren er nog staan; het algoritme "graaft" gangen
// door muren tussen bezochte en onbezochte cellen weg te halen.

export interface Cell {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export interface Maze {
  size: number
  cells: Cell[][] // [rij][kolom]
}

export type Direction = 'up' | 'down' | 'left' | 'right'

const DELTAS: Record<Direction, { dr: number; dc: number; wall: keyof Cell; opposite: keyof Cell }> = {
  up: { dr: -1, dc: 0, wall: 'top', opposite: 'bottom' },
  down: { dr: 1, dc: 0, wall: 'bottom', opposite: 'top' },
  left: { dr: 0, dc: -1, wall: 'left', opposite: 'right' },
  right: { dr: 0, dc: 1, wall: 'right', opposite: 'left' },
}

export function generateMaze(size: number): Maze {
  const cells: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: true, right: true, bottom: true, left: true })),
  )
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const stack: [number, number][] = [[0, 0]]
  visited[0][0] = true

  while (stack.length > 0) {
    const [row, col] = stack[stack.length - 1]
    const neighbours = (Object.keys(DELTAS) as Direction[])
      .map((dir) => ({ dir, row: row + DELTAS[dir].dr, col: col + DELTAS[dir].dc }))
      .filter((n) => n.row >= 0 && n.row < size && n.col >= 0 && n.col < size && !visited[n.row][n.col])

    if (neighbours.length === 0) {
      stack.pop()
      continue
    }

    const next = neighbours[Math.floor(Math.random() * neighbours.length)]
    const delta = DELTAS[next.dir]
    cells[row][col][delta.wall] = false
    cells[next.row][next.col][delta.opposite] = false
    visited[next.row][next.col] = true
    stack.push([next.row, next.col])
  }

  return { size, cells }
}

/** Mag je vanuit (row, col) in deze richting stappen? */
export function canMove(maze: Maze, row: number, col: number, dir: Direction): boolean {
  const delta = DELTAS[dir]
  const nr = row + delta.dr
  const nc = col + delta.dc
  if (nr < 0 || nr >= maze.size || nc < 0 || nc >= maze.size) return false
  return !maze.cells[row][col][delta.wall]
}

export function moveDelta(dir: Direction): { dr: number; dc: number } {
  return { dr: DELTAS[dir].dr, dc: DELTAS[dir].dc }
}
