export type PuzzelVorm = 'puzzel' | 'vierkant' | 'vrije'

export interface PuzzelOptie {
  count: number
  rows: number
  cols: number
  label: string
}

export const PUZZEL_OPTIES: PuzzelOptie[] = [
  { count: 9, rows: 3, cols: 3, label: '9' },
  { count: 16, rows: 4, cols: 4, label: '16' },
  { count: 20, rows: 4, cols: 5, label: '20' },
  { count: 25, rows: 5, cols: 5, label: '25' },
  { count: 30, rows: 5, cols: 6, label: '30' },
  { count: 42, rows: 6, cols: 7, label: '42' },
]

export const VORM_OPTIES: { id: PuzzelVorm; label: string; icon: string }[] = [
  { id: 'puzzel', label: 'Puzzelstukjes', icon: '🧩' },
  { id: 'vierkant', label: 'Vierkant/rechthoek', icon: '◻️' },
  { id: 'vrije', label: 'Vrije vorm', icon: '✂️' },
]

interface Punt {
  x: number
  y: number
}

/** Genereert de puntenreeks van (0,0) naar (length,0) voor 1 rand, loodrecht uitgeweken volgens vorm. */
function randEdgePoints(length: number, vorm: PuzzelVorm, amp: number, sign: number, rng: () => number): Punt[] {
  if (vorm === 'vierkant') {
    return [
      { x: 0, y: 0 },
      { x: length, y: 0 },
    ]
  }
  if (vorm === 'vrije') {
    const punten: Punt[] = [{ x: 0, y: 0 }]
    const stops = [0.25, 0.5, 0.75]
    for (const t of stops) {
      punten.push({ x: length * t, y: amp * (rng() * 2 - 1) })
    }
    punten.push({ x: length, y: 0 })
    return punten
  }
  // 'puzzel': rechte hals + halfronde bult in het midden
  const r = amp
  const mid = length / 2
  const punten: Punt[] = [
    { x: 0, y: 0 },
    { x: mid - r, y: 0 },
  ]
  const K = 10
  for (let i = 0; i <= K; i++) {
    const theta = (Math.PI * i) / K
    punten.push({ x: mid - r * Math.cos(theta), y: -sign * r * Math.sin(theta) })
  }
  punten.push({ x: mid + r, y: 0 })
  punten.push({ x: length, y: 0 })
  return punten
}

/** Simpele seeded RNG (mulberry32) zodat een puzzel-indeling reproduceerbaar is binnen 1 potje. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Stukje {
  index: number
  row: number
  col: number
  /** Randpad in wereldcoördinaten (px t.o.v. de volledige afbeelding), sluitend polygon. */
  pad: Punt[]
}

/** Bouwt voor elk stukje het sluitende randpad, met gedeelde (dus naadloos passende) randen tussen buren. */
export function bouwStukjes(
  rows: number,
  cols: number,
  imgW: number,
  imgH: number,
  vorm: PuzzelVorm,
  seed: number,
): Stukje[] {
  const rng = mulberry32(seed)
  const pieceW = imgW / cols
  const pieceH = imgH / rows
  const amp = vorm === 'vrije' ? Math.min(pieceW, pieceH) * 0.09 : Math.min(pieceW, pieceH) * 0.13

  // rowEdges[r][c]: horizontale rand tussen stuk (r,c) en (r+1,c), canoniek links->rechts
  const rowEdges: Punt[][][] = []
  for (let r = 0; r < rows - 1; r++) {
    rowEdges.push([])
    for (let c = 0; c < cols; c++) {
      const sign = rng() < 0.5 ? 1 : -1
      const pts = randEdgePoints(pieceW, vorm, amp, sign, rng).map((p) => ({
        x: c * pieceW + p.x,
        y: (r + 1) * pieceH + p.y,
      }))
      rowEdges[r].push(pts)
    }
  }
  // colEdges[r][c]: verticale rand tussen stuk (r,c) en (r,c+1), canoniek boven->onder
  const colEdges: Punt[][][] = []
  for (let r = 0; r < rows; r++) {
    colEdges.push([])
    for (let c = 0; c < cols - 1; c++) {
      const sign = rng() < 0.5 ? 1 : -1
      // let op: x/y omgewisseld t.o.v. randEdgePoints (die werkt in "lengte,loodrecht")
      const pts = randEdgePoints(pieceH, vorm, amp, sign, rng).map((p) => ({
        x: (c + 1) * pieceW + p.y,
        y: r * pieceH + p.x,
      }))
      colEdges[r].push(pts)
    }
  }

  const stukjes: Stukje[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = r === 0 ? [{ x: c * pieceW, y: r * pieceH }, { x: (c + 1) * pieceW, y: r * pieceH }] : rowEdges[r - 1][c]
      const right =
        c === cols - 1
          ? [{ x: (c + 1) * pieceW, y: r * pieceH }, { x: (c + 1) * pieceW, y: (r + 1) * pieceH }]
          : colEdges[r][c]
      const bottom =
        r === rows - 1
          ? [{ x: (c + 1) * pieceW, y: (r + 1) * pieceH }, { x: c * pieceW, y: (r + 1) * pieceH }]
          : [...rowEdges[r][c]].reverse()
      const left =
        c === 0
          ? [{ x: c * pieceW, y: (r + 1) * pieceH }, { x: c * pieceW, y: r * pieceH }]
          : [...colEdges[r][c - 1]].reverse()

      const pad = [...top, ...right.slice(1), ...bottom.slice(1), ...left.slice(1, -1)]
      stukjes.push({ index: r * cols + c, row: r, col: c, pad })
    }
  }
  return stukjes
}

/** Tekent 1 stukje op een bestaand canvas (transparante achtergrond buiten het stukje-pad). */
export function tekenStukjeOpCanvas(
  canvas: HTMLCanvasElement,
  bron: HTMLImageElement,
  stukje: Stukje,
  pieceW: number,
  pieceH: number,
  margin: number,
): void {
  canvas.width = Math.ceil(pieceW + margin * 2)
  canvas.height = Math.ceil(pieceH + margin * 2)
  const ctx = canvas.getContext('2d')!
  const ox = stukje.col * pieceW
  const oy = stukje.row * pieceH
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.beginPath()
  stukje.pad.forEach((p, i) => {
    const lx = p.x - ox + margin
    const ly = p.y - oy + margin
    if (i === 0) ctx.moveTo(lx, ly)
    else ctx.lineTo(lx, ly)
  })
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(bron, -ox + margin, -oy + margin)
  ctx.restore()
}
