// Genereert oefeningen voor cijferend aftrekken: twee getallen onder elkaar,
// kolom per kolom oplossen van rechts naar links, met lenen waar nodig.

export interface SubtractionProblem {
  a: number
  b: number
  digits: number // aantal kolommen (= cijfers van a én van het antwoord)
  answer: number
  /** Verwacht antwoordcijfer per kolom, index 0 = rechtse kolom. */
  expected: number[]
  /** Leent kolom i van de kolom links ervan? */
  borrows: boolean[]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function digitsOf(n: number, width: number): number[] {
  // index 0 = eenheden
  return Array.from({ length: width }, (_, i) => Math.floor(n / 10 ** i) % 10)
}

function buildColumns(a: number, b: number, width: number): { expected: number[]; borrows: boolean[] } {
  const da = digitsOf(a, width)
  const db = digitsOf(b, width)
  const expected: number[] = []
  const borrows: boolean[] = []
  let borrowIn = 0
  for (let i = 0; i < width; i++) {
    const top = da[i] - borrowIn
    if (top < db[i]) {
      expected.push(top + 10 - db[i])
      borrows.push(true)
      borrowIn = 1
    } else {
      expected.push(top - db[i])
      borrows.push(false)
      borrowIn = 0
    }
  }
  return { expected, borrows }
}

/**
 * Niveaus:
 * 1 — 2 cijfers, zonder lenen
 * 2 — 2 cijfers, met lenen
 * 3 — 3 cijfers, met lenen
 * 4 — 4 cijfers, met lenen
 */
export function generateProblem(level: number): SubtractionProblem {
  const digits = level <= 2 ? 2 : level === 3 ? 3 : 4
  const wantBorrow = level >= 2

  for (;;) {
    const min = 10 ** (digits - 1)
    const max = 10 ** digits - 1
    const a = randomInt(min + 1, max)
    const b = randomInt(min > 10 ? min : 1, a - 1)
    const answer = a - b
    // Antwoord even breed als a: geen kolommen met voorloopnullen
    if (answer < min) continue
    const { expected, borrows } = buildColumns(a, b, digits)
    const hasBorrow = borrows.some(Boolean)
    if (hasBorrow !== wantBorrow) continue
    return { a, b, digits, answer, expected, borrows }
  }
}

/** Zachte hint bij een eerste fout in kolom `col` (0 = rechts). */
export function hintFor(problem: SubtractionProblem, col: number): string {
  const da = digitsOf(problem.a, problem.digits)
  const db = digitsOf(problem.b, problem.digits)
  const borrowIn = col > 0 && problem.borrows[col - 1] ? 1 : 0
  const top = da[col] - borrowIn
  const geleend = borrowIn ? ` (je had al 1 uitgeleend, dus ${da[col]} werd ${top})` : ''
  if (problem.borrows[col]) {
    return `${top} − ${db[col]} gaat niet${geleend}. Leen bij de buur: maak er ${top + 10} van!`
  }
  return `Reken uit: ${top} − ${db[col]}${geleend}.`
}

/** Sterkere hint bij een tweede fout: rekent de kolom bijna helemaal voor. */
export function strongHintFor(problem: SubtractionProblem, col: number): string {
  const da = digitsOf(problem.a, problem.digits)
  const db = digitsOf(problem.b, problem.digits)
  const borrowIn = col > 0 && problem.borrows[col - 1] ? 1 : 0
  const top = da[col] - borrowIn
  if (problem.borrows[col]) {
    return `Tip: ${top} − ${db[col]} lukt niet, dus je leent 10. Reken dan: ${top + 10} − ${db[col]}. Tel maar na op je vingers!`
  }
  return `Tip: begin bij ${top} en tel er ${db[col]} af. Je komt uit op ${top} − ${db[col]}.`
}
