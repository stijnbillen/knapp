// Genereert staartdelingen en de volledige stappenlijst zoals je die op
// papier uitwerkt: quotiëntcijfer → product → aftrekking → cijfer zakt.

export type StepKind = 'quotient' | 'product' | 'subtract' | 'bringdown'

export interface DivisionStep {
  kind: StepKind
  expected: number
  /** Waarde waarmee we op dit moment aan het rekenen zijn (voor hints). */
  current: number
  /** Kolom (0-gebaseerd, in het deeltal) waar deze stap eindigt. */
  column: number
  /** Het zojuist ingevulde quotiëntcijfer (voor product-hints). */
  quotientDigit?: number
}

export interface DivisionProblem {
  deeltal: number
  deler: number
  quotient: number
  rest: number
  steps: DivisionStep[]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/**
 * Niveaus:
 * 1 — deler van 1 cijfer, zonder rest
 * 2 — deler van 1 cijfer, met rest
 * 3 — deler van 2 cijfers, zonder rest
 * 4 — deler van 2 cijfers, met rest
 */
export function generateProblem(level: number): DivisionProblem {
  const singleDigit = level <= 2
  const withRest = level === 2 || level === 4
  const deler = singleDigit ? randomInt(3, 9) : randomInt(12, 25)
  const quotient = singleDigit ? randomInt(102, 999) : randomInt(21, 99)
  const rest = withRest ? randomInt(1, deler - 1) : 0
  const deeltal = deler * quotient + rest
  return { deeltal, deler, quotient, rest, steps: buildSteps(deeltal, deler) }
}

export function buildSteps(deeltal: number, deler: number): DivisionStep[] {
  const digits = String(deeltal).split('').map(Number)
  const steps: DivisionStep[] = []

  // Eerste groep: neem cijfers tot de waarde minstens de deler is
  let pos = 0
  let current = 0
  while (pos < digits.length && current < deler) {
    current = current * 10 + digits[pos]
    pos++
  }

  for (;;) {
    const column = pos - 1
    const q = Math.floor(current / deler)
    const product = q * deler
    const rest = current - product

    steps.push({ kind: 'quotient', expected: q, current, column })
    steps.push({ kind: 'product', expected: product, current, column, quotientDigit: q })
    steps.push({ kind: 'subtract', expected: rest, current, column, quotientDigit: q })

    if (pos >= digits.length) break
    const digit = digits[pos]
    steps.push({ kind: 'bringdown', expected: digit, current: rest, column: pos })
    current = rest * 10 + digit
    pos++
  }

  return steps
}

/** Eerste, zachte hint bij een fout. */
export function hintFor(step: DivisionStep, deler: number): string {
  switch (step.kind) {
    case 'quotient':
      return `Hoeveel keer gaat ${deler} in ${step.current}? Het mag er niet over gaan.`
    case 'product':
      return `Reken uit: ${step.quotientDigit} × ${deler}.`
    case 'subtract':
      return `Trek af: ${step.current} − ${step.quotientDigit! * deler}.`
    case 'bringdown':
      return 'Welk cijfer van het deeltal moet nu zakken? Kijk naar het volgende cijfer.'
  }
}

/** Sterkere hint bij een tweede fout — helpt goed op weg, zonder het antwoord te geven. */
export function strongHintFor(step: DivisionStep, deler: number): string {
  switch (step.kind) {
    case 'quotient': {
      const q = Math.floor(step.current / deler)
      return `Tip: ${deler} × ${q} = ${deler * q}, en ${deler} × ${q + 1} = ${deler * (q + 1)}. Dat laatste is te veel! Welke keer past dus?`
    }
    case 'product':
      return `Tel het samen: ${step.quotientDigit} keer ${deler}. Bijvoorbeeld ${step.quotientDigit} × ${deler} = ${deler} + ${deler} + … (${step.quotientDigit} keer).`
    case 'subtract': {
      const product = step.quotientDigit! * deler
      return `Zet het onder elkaar: ${step.current} min ${product}. Werk cijfer per cijfer.`
    }
    case 'bringdown':
      return 'Het cijfer dat zakt staat in het deeltal, meteen rechts van waar je nu bent. Schrijf het naast je rest.'
  }
}
