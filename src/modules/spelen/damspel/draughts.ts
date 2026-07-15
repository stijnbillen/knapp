// Internationaal dammen (10x10, vliegende dam, verplicht slaan) — geschreven
// als aparte speel-engine, zelfde opzet als chess.ts.
//
// Bord: platte array van 100 velden, index = row*10+col, rij 0 = zwarte kant
// (net als bij het schaakbord), enkel de donkere velden ((row+col) oneven)
// zijn speelbaar.

export type Color = 'w' | 'b'
export type PieceType = 'M' | 'D' // man / dam

export interface Piece {
  type: PieceType
  color: Color
}

export type Square = Piece | null
export type Board = Square[]

export interface GameState {
  board: Board
  turn: Color
  /** Als een schijf midden in een meervoudige slagzet zit: enkel die schijf mag nog verder. */
  forcedFrom: number | null
}

export interface Move {
  from: number
  to: number
  piece: Piece
  captured?: number // index van de geslagen schijf
}

const ALL_DIAG = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]

function idx(row: number, col: number): number {
  return row * 10 + col
}

function rc(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 10), col: index % 10 }
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 10 && col >= 0 && col < 10
}

export function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1
}

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

function forwardDirs(color: Color): number[][] {
  return color === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]
}

function manSimpleMoves(board: Board, from: number, color: Color): Move[] {
  const { row, col } = rc(from)
  const piece = board[from]!
  const moves: Move[] = []
  for (const [dr, dc] of forwardDirs(color)) {
    const r = row + dr
    const c = col + dc
    if (inBounds(r, c) && !board[idx(r, c)]) moves.push({ from, to: idx(r, c), piece })
  }
  return moves
}

// Mannen mogen in het internationale dammen ook achterwaarts slaan.
function manCaptureMoves(board: Board, from: number, color: Color): Move[] {
  const { row, col } = rc(from)
  const piece = board[from]!
  const moves: Move[] = []
  for (const [dr, dc] of ALL_DIAG) {
    const mr = row + dr
    const mc = col + dc
    const lr = row + 2 * dr
    const lc = col + 2 * dc
    if (!inBounds(mr, mc) || !inBounds(lr, lc)) continue
    const mid = board[idx(mr, mc)]
    if (mid && mid.color !== color && !board[idx(lr, lc)]) {
      moves.push({ from, to: idx(lr, lc), piece, captured: idx(mr, mc) })
    }
  }
  return moves
}

function kingSimpleMoves(board: Board, from: number): Move[] {
  const { row, col } = rc(from)
  const piece = board[from]!
  const moves: Move[] = []
  for (const [dr, dc] of ALL_DIAG) {
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c) && !board[idx(r, c)]) {
      moves.push({ from, to: idx(r, c), piece })
      r += dr
      c += dc
    }
  }
  return moves
}

// Vliegende dam: mag van ver komen aanlopen en na de slag ook ver doorlanden.
function kingCaptureMoves(board: Board, from: number, color: Color): Move[] {
  const { row, col } = rc(from)
  const piece = board[from]!
  const moves: Move[] = []
  for (const [dr, dc] of ALL_DIAG) {
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c) && !board[idx(r, c)]) {
      r += dr
      c += dc
    }
    if (!inBounds(r, c)) continue
    const mid = board[idx(r, c)]
    if (!mid || mid.color === color) continue
    const midIdx = idx(r, c)
    let lr = r + dr
    let lc = c + dc
    while (inBounds(lr, lc) && !board[idx(lr, lc)]) {
      moves.push({ from, to: idx(lr, lc), piece, captured: midIdx })
      lr += dr
      lc += dc
    }
  }
  return moves
}

function captureMovesForSquare(board: Board, from: number): Move[] {
  const piece = board[from]
  if (!piece) return []
  return piece.type === 'M' ? manCaptureMoves(board, from, piece.color) : kingCaptureMoves(board, from, piece.color)
}

function simpleMovesForSquare(board: Board, from: number): Move[] {
  const piece = board[from]
  if (!piece) return []
  return piece.type === 'M' ? manSimpleMoves(board, from, piece.color) : kingSimpleMoves(board, from)
}

function hasAnyCapture(board: Board, color: Color): boolean {
  for (let i = 0; i < 100; i++) {
    const p = board[i]
    if (p && p.color === color && captureMovesForSquare(board, i).length > 0) return true
  }
  return false
}

/** Legale zetten voor de schijf op `from` — houdt rekening met verplicht slaan
 * (voor het hele kamp) en met een lopende meervoudige slag (enkel die schijf). */
export function legalMovesForSquare(state: GameState, from: number): Move[] {
  const piece = state.board[from]
  if (!piece || piece.color !== state.turn) return []
  if (state.forcedFrom != null) {
    return from === state.forcedFrom ? captureMovesForSquare(state.board, from) : []
  }
  const captures = captureMovesForSquare(state.board, from)
  if (hasAnyCapture(state.board, piece.color)) return captures
  return simpleMovesForSquare(state.board, from)
}

export function legalMoves(state: GameState, color: Color): Move[] {
  if (state.turn !== color) return []
  if (state.forcedFrom != null) return legalMovesForSquare(state, state.forcedFrom)
  const out: Move[] = []
  const anyCapture = hasAnyCapture(state.board, color)
  for (let i = 0; i < 100; i++) {
    const p = state.board[i]
    if (!p || p.color !== color) continue
    out.push(...(anyCapture ? captureMovesForSquare(state.board, i) : simpleMovesForSquare(state.board, i)))
  }
  return out
}

export function applyMove(state: GameState, move: Move): GameState {
  const board = [...state.board]
  const piece = board[move.from]!
  board[move.from] = null
  if (move.captured != null) board[move.captured] = null

  const { row: toRow } = rc(move.to)
  const promoRow = piece.color === 'w' ? 0 : 9
  const finalPiece: Piece = piece.type === 'M' && toRow === promoRow ? { type: 'D', color: piece.color } : piece
  board[move.to] = finalPiece

  if (move.captured != null) {
    const further = captureMovesForSquare(board, move.to)
    if (further.length > 0) return { board, turn: piece.color, forcedFrom: move.to }
  }
  return { board, turn: opposite(piece.color), forcedFrom: null }
}

export function isGameOver(state: GameState): boolean {
  return legalMoves(state, state.turn).length === 0
}

export function winnerColor(state: GameState): Color {
  return opposite(state.turn)
}

export function initialGameState(): GameState {
  const board: Board = Array(100).fill(null)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      if (isDark(row, col)) board[idx(row, col)] = { type: 'M', color: 'b' }
    }
  }
  for (let row = 6; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (isDark(row, col)) board[idx(row, col)] = { type: 'M', color: 'w' }
    }
  }
  return { board, turn: 'w', forcedFrom: null }
}

const PIECE_VALUE: Record<PieceType, number> = { M: 1, D: 3 }

function materialDifferential(board: Board, color: Color): number {
  let score = 0
  for (const p of board) {
    if (!p) continue
    score += p.color === color ? PIECE_VALUE[p.type] : -PIECE_VALUE[p.type]
  }
  return score
}

/** Niveau 1: bijna willekeurig, lichte voorkeur voor slaan (en de grootste slag).
 * Niveau 2: 1 zet vooruitdenken op materiaal, met bonus als de tegenstander dan vastzit. */
export function aiChooseMove(state: GameState, level: 1 | 2): Move | null {
  const color = state.turn
  const moves = legalMoves(state, color)
  if (moves.length === 0) return null

  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    let score: number
    if (level === 1) {
      score = (m.captured != null ? 2 : 0) + Math.random() * 1.5
    } else {
      const next = applyMove(state, m)
      score = materialDifferential(next.board, color) + Math.random() * 0.5
      if (next.turn !== color && legalMoves(next, opposite(color)).length === 0) score = Infinity
    }
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

/** Zet-doelen van één schijf op een (bijna) leeg bord — voor het uitlegscherm. */
export function demoMoves(board: Board, from: number): number[] {
  return simpleMovesForSquare(board, from).map((m) => m.to)
}

export function emptyBoard(): Board {
  return Array(100).fill(null)
}

export function squareIndex(row: number, col: number): number {
  return idx(row, col)
}

/** Kant-en-klaar voorbeeldbordje: man kan schuin-achterwaarts slaan. */
export function manCaptureDemo(): { board: Board; from: number; targets: number[] } {
  const board = emptyBoard()
  const from = idx(6, 4)
  board[from] = { type: 'M', color: 'w' }
  board[idx(5, 3)] = { type: 'M', color: 'b' }
  return { board, from, targets: captureMovesForSquare(board, from).map((m) => m.to) }
}

/** Kant-en-klaar voorbeeldbordje: vliegende dam kan van ver slaan en ver landen. */
export function kingCaptureDemo(): { board: Board; from: number; targets: number[] } {
  const board = emptyBoard()
  const from = idx(7, 2)
  board[from] = { type: 'D', color: 'w' }
  board[idx(6, 3)] = { type: 'M', color: 'b' }
  return { board, from, targets: captureMovesForSquare(board, from).map((m) => m.to) }
}
