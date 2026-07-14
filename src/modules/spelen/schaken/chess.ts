// Handgeschreven schaakengine: volledige regels (rokade, en-passant, promotie,
// schaak/mat/pat, onvoldoende materiaal) maar bewust zonder zetherhaling of de
// 50-zetten-regel — te zeldzaam voor een beginner tegen een simpele computer.
//
// Bord: platte array van 64 velden, index = row*8+col, rij 0 = de 8e rij
// (zwarte startrij) zodat wit onderaan staat zoals een speler aan het bord.

export type PieceType = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K'
export type Color = 'w' | 'b'

export interface Piece {
  type: PieceType
  color: Color
}

export type Square = Piece | null
export type Board = Square[]

export interface CastlingRights {
  wK: boolean
  wQ: boolean
  bK: boolean
  bQ: boolean
}

export interface GameState {
  board: Board
  turn: Color
  castling: CastlingRights
  enPassantTarget: number | null
}

export interface Move {
  from: number
  to: number
  piece: Piece
  captured?: Piece
  isEnPassant?: boolean
  isCastle?: 'K' | 'Q'
  promotion?: boolean
  promoteTo?: PieceType
}

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw-material'

function idx(row: number, col: number): number {
  return row * 8 + col
}

function rc(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 8), col: index % 8 }
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8
}

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

function findKing(board: Board, color: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i]
    if (p && p.type === 'K' && p.color === color) return i
  }
  return -1
}

const ROOK_DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]
const BISHOP_DIRS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]
const QUEEN_DIRS = [...ROOK_DIRS, ...BISHOP_DIRS]
const KNIGHT_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
]
const KING_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

function slidingMoves(board: Board, from: number, color: Color, dirs: number[][]): Move[] {
  const { row, col } = rc(from)
  const piece = board[from]!
  const moves: Move[] = []
  for (const [dr, dc] of dirs) {
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c)) {
      const target = idx(r, c)
      const occ = board[target]
      if (!occ) {
        moves.push({ from, to: target, piece })
      } else {
        if (occ.color !== color) moves.push({ from, to: target, piece, captured: occ })
        break
      }
      r += dr
      c += dc
    }
  }
  return moves
}

function knightMoves(board: Board, from: number, color: Color): Move[] {
  const { row, col } = rc(from)
  const piece = board[from]!
  const moves: Move[] = []
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const r = row + dr
    const c = col + dc
    if (!inBounds(r, c)) continue
    const target = idx(r, c)
    const occ = board[target]
    if (!occ) moves.push({ from, to: target, piece })
    else if (occ.color !== color) moves.push({ from, to: target, piece, captured: occ })
  }
  return moves
}

function kingMoves(board: Board, from: number, color: Color): Move[] {
  const { row, col } = rc(from)
  const piece = board[from]!
  const moves: Move[] = []
  for (const [dr, dc] of KING_OFFSETS) {
    const r = row + dr
    const c = col + dc
    if (!inBounds(r, c)) continue
    const target = idx(r, c)
    const occ = board[target]
    if (!occ) moves.push({ from, to: target, piece })
    else if (occ.color !== color) moves.push({ from, to: target, piece, captured: occ })
  }
  return moves
}

function pawnMoves(state: GameState, from: number): Move[] {
  const board = state.board
  const piece = board[from]!
  const color = piece.color
  const { row, col } = rc(from)
  const dir = color === 'w' ? -1 : 1
  const startRow = color === 'w' ? 6 : 1
  const promoRow = color === 'w' ? 0 : 7
  const moves: Move[] = []

  const r1 = row + dir
  if (inBounds(r1, col) && !board[idx(r1, col)]) {
    moves.push({ from, to: idx(r1, col), piece, promotion: r1 === promoRow || undefined })
    if (row === startRow) {
      const r2 = row + 2 * dir
      if (!board[idx(r2, col)]) {
        moves.push({ from, to: idx(r2, col), piece })
      }
    }
  }

  for (const dc of [-1, 1]) {
    const c1 = col + dc
    if (!inBounds(r1, c1)) continue
    const target = idx(r1, c1)
    const occ = board[target]
    if (occ && occ.color !== color) {
      moves.push({ from, to: target, piece, captured: occ, promotion: r1 === promoRow || undefined })
    } else if (!occ && state.enPassantTarget === target) {
      const capturedIdx = idx(row, c1)
      const captured = board[capturedIdx]
      if (captured && captured.type === 'P' && captured.color !== color) {
        moves.push({ from, to: target, piece, captured, isEnPassant: true })
      }
    }
  }

  return moves
}

function castlingMoves(state: GameState, kingIndex: number, color: Color): Move[] {
  const backRow = color === 'w' ? 7 : 0
  if (kingIndex !== idx(backRow, 4)) return []
  const rights = state.castling
  const kRight = color === 'w' ? rights.wK : rights.bK
  const qRight = color === 'w' ? rights.wQ : rights.bQ
  const opp = opposite(color)
  const board = state.board
  const king = board[kingIndex]!
  const moves: Move[] = []

  if (kRight) {
    const f = idx(backRow, 5)
    const g = idx(backRow, 6)
    const h = idx(backRow, 7)
    const rook = board[h]
    if (!board[f] && !board[g] && rook && rook.type === 'R' && rook.color === color) {
      if (
        !isSquareAttacked(board, kingIndex, opp) &&
        !isSquareAttacked(board, f, opp) &&
        !isSquareAttacked(board, g, opp)
      ) {
        moves.push({ from: kingIndex, to: g, piece: king, isCastle: 'K' })
      }
    }
  }

  if (qRight) {
    const d = idx(backRow, 3)
    const c = idx(backRow, 2)
    const b = idx(backRow, 1)
    const a = idx(backRow, 0)
    const rook = board[a]
    if (!board[d] && !board[c] && !board[b] && rook && rook.type === 'R' && rook.color === color) {
      if (
        !isSquareAttacked(board, kingIndex, opp) &&
        !isSquareAttacked(board, d, opp) &&
        !isSquareAttacked(board, c, opp)
      ) {
        moves.push({ from: kingIndex, to: c, piece: king, isCastle: 'Q' })
      }
    }
  }

  return moves
}

/** Wordt veld `index` aangevallen door een stuk van `byColor`? Straalt vanaf
 * het doelveld terug per stuktype i.p.v. alle tegenstanderzetten te genereren. */
export function isSquareAttacked(board: Board, index: number, byColor: Color): boolean {
  if (index < 0) return false
  const { row, col } = rc(index)

  const pawnDir = byColor === 'w' ? -1 : 1
  const attackerRow = row - pawnDir
  for (const dc of [-1, 1]) {
    const c = col + dc
    if (inBounds(attackerRow, c)) {
      const p = board[idx(attackerRow, c)]
      if (p && p.type === 'P' && p.color === byColor) return true
    }
  }

  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const r = row + dr
    const c = col + dc
    if (inBounds(r, c)) {
      const p = board[idx(r, c)]
      if (p && p.type === 'N' && p.color === byColor) return true
    }
  }

  for (const [dr, dc] of KING_OFFSETS) {
    const r = row + dr
    const c = col + dc
    if (inBounds(r, c)) {
      const p = board[idx(r, c)]
      if (p && p.type === 'K' && p.color === byColor) return true
    }
  }

  for (const [dr, dc] of ROOK_DIRS) {
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c)) {
      const p = board[idx(r, c)]
      if (p) {
        if (p.color === byColor && (p.type === 'R' || p.type === 'Q')) return true
        break
      }
      r += dr
      c += dc
    }
  }

  for (const [dr, dc] of BISHOP_DIRS) {
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c)) {
      const p = board[idx(r, c)]
      if (p) {
        if (p.color === byColor && (p.type === 'B' || p.type === 'Q')) return true
        break
      }
      r += dr
      c += dc
    }
  }

  return false
}

export function pseudoLegalMovesForSquare(state: GameState, from: number): Move[] {
  const piece = state.board[from]
  if (!piece) return []
  switch (piece.type) {
    case 'P':
      return pawnMoves(state, from)
    case 'N':
      return knightMoves(state.board, from, piece.color)
    case 'B':
      return slidingMoves(state.board, from, piece.color, BISHOP_DIRS)
    case 'R':
      return slidingMoves(state.board, from, piece.color, ROOK_DIRS)
    case 'Q':
      return slidingMoves(state.board, from, piece.color, QUEEN_DIRS)
    case 'K':
      return [...kingMoves(state.board, from, piece.color), ...castlingMoves(state, from, piece.color)]
  }
}

export function applyMove(state: GameState, move: Move): GameState {
  const board = [...state.board]
  const piece = board[move.from]!
  board[move.from] = null

  if (move.isEnPassant) {
    const { row: fromRow } = rc(move.from)
    const { col: toCol } = rc(move.to)
    board[idx(fromRow, toCol)] = null
  }

  const finalPiece: Piece = move.promotion ? { type: move.promoteTo ?? 'Q', color: piece.color } : piece
  board[move.to] = finalPiece

  if (move.isCastle) {
    const backRow = piece.color === 'w' ? 7 : 0
    if (move.isCastle === 'K') {
      board[idx(backRow, 5)] = board[idx(backRow, 7)]
      board[idx(backRow, 7)] = null
    } else {
      board[idx(backRow, 3)] = board[idx(backRow, 0)]
      board[idx(backRow, 0)] = null
    }
  }

  const castling = { ...state.castling }
  if (piece.type === 'K') {
    if (piece.color === 'w') {
      castling.wK = false
      castling.wQ = false
    } else {
      castling.bK = false
      castling.bQ = false
    }
  }
  const clearIfRookSquare = (square: number) => {
    if (square === idx(7, 0)) castling.wQ = false
    else if (square === idx(7, 7)) castling.wK = false
    else if (square === idx(0, 0)) castling.bQ = false
    else if (square === idx(0, 7)) castling.bK = false
  }
  clearIfRookSquare(move.from)
  clearIfRookSquare(move.to) // dekt ook een niet-bewogen toren die veroverd wordt

  let enPassantTarget: number | null = null
  if (piece.type === 'P' && Math.abs(rc(move.to).row - rc(move.from).row) === 2) {
    enPassantTarget = idx((rc(move.from).row + rc(move.to).row) / 2, rc(move.from).col)
  }

  return { board, turn: opposite(piece.color), castling, enPassantTarget }
}

/** Legale zetten voor het stuk op `from`, gefilterd op eigen koningsveiligheid. */
export function legalMovesForSquare(state: GameState, from: number): Move[] {
  const piece = state.board[from]
  if (!piece) return []
  return pseudoLegalMovesForSquare(state, from).filter((m) => {
    const testMove = m.promotion && !m.promoteTo ? { ...m, promoteTo: 'Q' as PieceType } : m
    const next = applyMove(state, testMove)
    const kingIdx = findKing(next.board, piece.color)
    return !isSquareAttacked(next.board, kingIdx, opposite(piece.color))
  })
}

export function legalMoves(state: GameState, color: Color): Move[] {
  const out: Move[] = []
  for (let i = 0; i < 64; i++) {
    const p = state.board[i]
    if (p && p.color === color) out.push(...legalMovesForSquare(state, i))
  }
  return out
}

export function needsPromotionChoice(move: Move): boolean {
  return move.promotion === true && !move.promoteTo
}

export function isInCheck(state: GameState, color: Color): boolean {
  return isSquareAttacked(state.board, findKing(state.board, color), opposite(color))
}

export function isCheckmate(state: GameState): boolean {
  return isInCheck(state, state.turn) && legalMoves(state, state.turn).length === 0
}

export function isStalemate(state: GameState): boolean {
  return !isInCheck(state, state.turn) && legalMoves(state, state.turn).length === 0
}

/** Vereenvoudigd t.o.v. de strikte FIDE-regels (bv. twee lopers op dezelfde
 * veldkleur of K+P+P worden niet apart onderscheiden) — voldoende voor een
 * beginnersspel: enkel koning(en) of koning + één lichte stuk per kant. */
export function isInsufficientMaterial(board: Board): boolean {
  const white = board.filter((p): p is Piece => !!p && p.color === 'w' && p.type !== 'K')
  const black = board.filter((p): p is Piece => !!p && p.color === 'b' && p.type !== 'K')
  const isMinorOrNone = (arr: Piece[]) => arr.length === 0 || (arr.length === 1 && (arr[0].type === 'B' || arr[0].type === 'N'))
  return isMinorOrNone(white) && isMinorOrNone(black)
}

export function gameStatus(state: GameState): GameStatus {
  if (isCheckmate(state)) return 'checkmate'
  if (isStalemate(state)) return 'stalemate'
  if (isInsufficientMaterial(state.board)) return 'draw-material'
  return 'playing'
}

const BACK_RANK: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']

export function initialGameState(): GameState {
  const board: Board = Array(64).fill(null)
  for (let col = 0; col < 8; col++) {
    board[idx(0, col)] = { type: BACK_RANK[col], color: 'b' }
    board[idx(1, col)] = { type: 'P', color: 'b' }
    board[idx(6, col)] = { type: 'P', color: 'w' }
    board[idx(7, col)] = { type: BACK_RANK[col], color: 'w' }
  }
  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
  }
}

const MATERIAL_VALUE: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 }

function materialDifferential(board: Board, color: Color): number {
  let score = 0
  for (const p of board) {
    if (!p) continue
    const value = MATERIAL_VALUE[p.type]
    score += p.color === color ? value : -value
  }
  return score
}

/** Niveau 1: bijna willekeurig, lichte voorkeur voor slagzetten.
 * Niveau 2: 1 zet vooruitdenken op materiaal, met een bonus voor mat. */
export function aiChooseMove(state: GameState, level: 1 | 2): Move | null {
  const color = state.turn
  const moves = legalMoves(state, color)
  if (moves.length === 0) return null

  let best = moves[0]
  let bestScore = -Infinity

  for (const m of moves) {
    const candidate: Move = m.promotion && !m.promoteTo ? { ...m, promoteTo: 'Q' } : m
    let score: number
    if (level === 1) {
      score = (candidate.captured ? MATERIAL_VALUE[candidate.captured.type] : 0) + Math.random() * 1.5
    } else {
      const next = applyMove(state, candidate)
      score = materialDifferential(next.board, color) + Math.random() * 0.5
      if (isCheckmate(next)) score = Infinity
    }
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}

/** Toont de zetten van één stuk op een leeg bord — voor het uitlegscherm. */
export function pieceMovesOnEmptyBoard(pieceType: PieceType, color: Color, fromIndex: number): number[] {
  const board: Board = Array(64).fill(null)
  board[fromIndex] = { type: pieceType, color }
  const state: GameState = {
    board,
    turn: color,
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    enPassantTarget: null,
  }
  return pseudoLegalMovesForSquare(state, fromIndex).map((m) => m.to)
}
