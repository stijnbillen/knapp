// Othello/Reversi-spellogica met een eenvoudige AI:
// greedy (meeste schijven draaien) met voorkeur voor hoeken; niveau 2
// vermijdt bovendien de gevaarlijke velden naast de hoeken.

export type Player = 1 | 2 // 1 = speler (zwart), 2 = computer (wit)
export type CellValue = 0 | Player
export type Board = CellValue[] // 64 cellen, rij per rij

export const SIZE = 8

const DIRECTIONS = [-9, -8, -7, -1, 1, 7, 8, 9]

export function initialBoard(): Board {
  const board: Board = Array(64).fill(0)
  board[27] = 2
  board[28] = 1
  board[35] = 1
  board[36] = 2
  return board
}

function inBounds(from: number, to: number, dir: number): boolean {
  if (to < 0 || to >= 64) return false
  // voorkom "omslaan" van rand naar rand bij horizontale/diagonale stappen
  const fromCol = from % SIZE
  const toCol = to % SIZE
  if ((dir === -1 || dir === 7 || dir === -9) && toCol >= fromCol) return false
  if ((dir === 1 || dir === -7 || dir === 9) && toCol <= fromCol) return false
  return true
}

export interface Move {
  index: number
  flips: number[]
}

export function validMoves(board: Board, player: Player): Move[] {
  const opponent: Player = player === 1 ? 2 : 1
  const moves: Move[] = []

  for (let i = 0; i < 64; i++) {
    if (board[i] !== 0) continue
    const flips: number[] = []
    for (const dir of DIRECTIONS) {
      const line: number[] = []
      let prev = i
      let cur = i + dir
      while (inBounds(prev, cur, dir) && board[cur] === opponent) {
        line.push(cur)
        prev = cur
        cur += dir
      }
      if (line.length > 0 && inBounds(prev, cur, dir) && board[cur] === player) {
        flips.push(...line)
      }
    }
    if (flips.length > 0) moves.push({ index: i, flips })
  }
  return moves
}

export function applyMove(board: Board, player: Player, move: Move): Board {
  const next = [...board]
  next[move.index] = player
  for (const f of move.flips) next[f] = player
  return next
}

export function countDiscs(board: Board): { player: number; ai: number } {
  let player = 0
  let ai = 0
  for (const cell of board) {
    if (cell === 1) player++
    else if (cell === 2) ai++
  }
  return { player, ai }
}

const CORNERS = [0, 7, 56, 63]
// X-velden (diagonaal naast een hoek) en C-velden (recht naast een hoek)
const X_SQUARES = [9, 14, 49, 54]
const C_SQUARES = [1, 8, 6, 15, 48, 57, 55, 62]

/**
 * Kiest de zet van de computer.
 * Niveau 1: meeste schijven, hoeken krijgen voorrang.
 * Niveau 2: hoeken wegen zwaarder en velden naast de hoeken worden vermeden.
 */
export function aiChooseMove(board: Board, level: 1 | 2): Move | null {
  const moves = validMoves(board, 2)
  if (moves.length === 0) return null

  let best: Move = moves[0]
  let bestScore = -Infinity
  for (const move of moves) {
    let score = move.flips.length
    if (CORNERS.includes(move.index)) score += level === 2 ? 40 : 15
    if (level === 2) {
      if (X_SQUARES.includes(move.index)) score -= 12
      if (C_SQUARES.includes(move.index)) score -= 6
    }
    // kleine willekeur zodat de computer niet altijd hetzelfde speelt
    score += Math.random() * 0.5
    if (score > bestScore) {
      bestScore = score
      best = move
    }
  }
  return best
}
