// Tetris-spellogica: stukken, rotaties, botsingen en lijnen wissen.

export const COLS = 10
export const ROWS = 20

// Basisvormen als [kolom, rij]-blokjes binnen een n×n-raster
const BASE_SHAPES: { size: number; blocks: [number, number][] }[] = [
  { size: 4, blocks: [[0, 1], [1, 1], [2, 1], [3, 1]] }, // I
  { size: 2, blocks: [[0, 0], [1, 0], [0, 1], [1, 1]] }, // O
  { size: 3, blocks: [[0, 1], [1, 1], [2, 1], [1, 0]] }, // T
  { size: 3, blocks: [[1, 0], [2, 0], [0, 1], [1, 1]] }, // S
  { size: 3, blocks: [[0, 0], [1, 0], [1, 1], [2, 1]] }, // Z
  { size: 3, blocks: [[0, 0], [0, 1], [1, 1], [2, 1]] }, // J
  { size: 3, blocks: [[2, 0], [0, 1], [1, 1], [2, 1]] }, // L
]

export const PIECE_COLORS = [
  '#4dc3d8', // I
  '#e8c94d', // O
  '#a86bd6', // T
  '#6fc46f', // S
  '#e07070', // Z
  '#6f8fd6', // J
  '#e0a050', // L
]

function rotateCW(blocks: [number, number][], size: number): [number, number][] {
  return blocks.map(([x, y]) => [size - 1 - y, x])
}

// [stuktype][rotatie] → lijst blokjes
export const SHAPES: [number, number][][][] = BASE_SHAPES.map(({ size, blocks }) => {
  const rotations: [number, number][][] = [blocks]
  for (let r = 1; r < 4; r++) {
    rotations.push(rotateCW(rotations[r - 1], size))
  }
  return rotations
})

export interface Piece {
  type: number
  rot: number
  x: number
  y: number
}

export type BoardGrid = number[] // COLS*ROWS; 0 = leeg, anders stuktype+1

export function emptyBoard(): BoardGrid {
  return Array(COLS * ROWS).fill(0)
}

export function pieceCells(piece: Piece): [number, number][] {
  return SHAPES[piece.type][piece.rot % 4].map(([x, y]) => [piece.x + x, piece.y + y])
}

export function collides(board: BoardGrid, piece: Piece): boolean {
  return pieceCells(piece).some(
    ([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y * COLS + x] !== 0),
  )
}

export function newPiece(type?: number): Piece {
  const t = type ?? Math.floor(Math.random() * SHAPES.length)
  return { type: t, rot: 0, x: Math.floor(COLS / 2) - 2, y: -1 }
}

export function lockPiece(board: BoardGrid, piece: Piece): BoardGrid {
  const next = [...board]
  for (const [x, y] of pieceCells(piece)) {
    if (y >= 0) next[y * COLS + x] = piece.type + 1
  }
  return next
}

/** Wist volle lijnen; geeft het nieuwe bord en het aantal gewiste lijnen terug. */
export function clearLines(board: BoardGrid): { board: BoardGrid; cleared: number } {
  const rows: number[][] = []
  for (let y = 0; y < ROWS; y++) {
    rows.push(board.slice(y * COLS, (y + 1) * COLS))
  }
  const remaining = rows.filter((row) => row.some((cell) => cell === 0))
  const cleared = ROWS - remaining.length
  while (remaining.length < ROWS) {
    remaining.unshift(Array(COLS).fill(0))
  }
  return { board: remaining.flat(), cleared }
}

export const LINE_SCORES = [0, 100, 300, 500, 800]

/** Valinterval in ms voor een gegeven level. */
export function dropInterval(level: number): number {
  return Math.max(90, 750 - (level - 1) * 65)
}
