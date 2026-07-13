// Genereert opgaven voor de maal- en deeltafels van 1 t/m 10.

export type Operation = 'maal' | 'deel' | 'mix'

export interface TableProblem {
  question: string
  answer: number
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle<T>(list: T[]): T[] {
  return [...list].sort(() => Math.random() - 0.5)
}

export function generateProblem(tables: number[], operation: Operation): TableProblem {
  const table = tables[randomInt(0, tables.length - 1)]
  const factor = randomInt(1, 10)
  const op = operation === 'mix' ? (Math.random() < 0.5 ? 'maal' : 'deel') : operation

  if (op === 'maal') {
    return { question: `${table} × ${factor} = ?`, answer: table * factor }
  }
  const dividend = table * factor
  return { question: `${dividend} : ${table} = ?`, answer: factor }
}

export function generateOptions(answer: number): number[] {
  const options = new Set<number>([answer])
  while (options.size < 4) {
    const distractor = answer + randomInt(-5, 5)
    if (distractor >= 0 && distractor !== answer) options.add(distractor)
  }
  return shuffle([...options])
}
