import { useMemo, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playClick, playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'
import type { DivisionProblem } from './division'
import { generateProblem, hintFor, strongHintFor } from './division'

const MODULE_ID = 'staartdeling'
const MAX_LEVEL = 4

// Eén werkbladrij links van de streep: een product- of restregel.
interface WorksheetRow {
  cells: (string | null)[]
  /** Rij waarop het actieve invulvak staat (rechts uitgelijnd op endCol). */
  activeEndCol?: number
}

interface WorksheetModel {
  deeltalCells: (string | null)[]
  rows: WorksheetRow[]
  quotient: string
  /** Waar de speler nu moet invullen. */
  activeArea: 'quotient' | 'row' | null
}

/**
 * Bouwt het werkblad op uit de reeds voltooide stappen. Kolom 0 is een extra
 * kolom voor het minteken; de cijfers van het deeltal staan in kolom 1..N.
 */
function buildModel(problem: DivisionProblem, stepIndex: number): WorksheetModel {
  const digits = String(problem.deeltal).split('')
  const width = digits.length + 1
  const emptyRow = (): (string | null)[] => Array<string | null>(width).fill(null)

  const deeltalCells = emptyRow()
  digits.forEach((d, i) => (deeltalCells[i + 1] = d))

  const rows: WorksheetRow[] = []
  let quotient = ''
  let activeArea: WorksheetModel['activeArea'] = null

  for (let i = 0; i <= stepIndex && i < problem.steps.length; i++) {
    const step = problem.steps[i]
    const isActive = i === stepIndex
    const endCol = step.column + 1 // verschoven door de mintekenkolom

    if (step.kind === 'quotient') {
      if (isActive) {
        activeArea = 'quotient'
      } else {
        quotient += String(step.expected)
      }
    } else if (step.kind === 'product') {
      const row = emptyRow()
      if (isActive) {
        rows.push({ cells: row, activeEndCol: endCol })
        activeArea = 'row'
      } else {
        const text = String(step.expected)
        const startCol = endCol - text.length + 1
        row[startCol - 1] = '−'
        text.split('').forEach((ch, k) => (row[startCol + k] = ch))
        rows.push({ cells: row })
      }
    } else if (step.kind === 'subtract') {
      const row = emptyRow()
      if (isActive) {
        rows.push({ cells: row, activeEndCol: endCol })
        activeArea = 'row'
      } else {
        const text = String(step.expected)
        const startCol = endCol - text.length + 1
        text.split('').forEach((ch, k) => (row[startCol + k] = ch))
        rows.push({ cells: row })
      }
    } else {
      // bringdown: cijfer zakt naast de laatste restregel
      const lastRow = rows[rows.length - 1]
      if (isActive) {
        lastRow.activeEndCol = endCol
        activeArea = 'row'
      } else {
        lastRow.cells[endCol] = String(step.expected)
      }
    }
  }

  return { deeltalCells, rows, quotient, activeArea }
}

const CELL = 34 // px per cijferkolom

function CellRow({
  cells,
  activeEndCol,
  buffer,
}: {
  cells: (string | null)[]
  activeEndCol?: number
  buffer: string
}) {
  const display = [...cells]
  if (activeEndCol !== undefined) {
    if (buffer.length === 0) {
      display[activeEndCol] = '▢'
    } else {
      const startCol = activeEndCol - buffer.length + 1
      buffer.split('').forEach((ch, k) => {
        const col = startCol + k
        if (col >= 0) display[col] = ch
      })
    }
  }
  return (
    <>
      {display.map((cell, i) => {
        const isInput =
          activeEndCol !== undefined &&
          i <= activeEndCol &&
          i > activeEndCol - Math.max(buffer.length, 1)
        return (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: CELL,
              height: CELL,
              fontSize: 24,
              fontWeight: 700,
              color: isInput ? 'var(--accent)' : 'inherit',
              background: isInput ? 'var(--accent-soft)' : 'transparent',
              borderRadius: 6,
            }}
          >
            {cell ?? ''}
          </span>
        )
      })}
    </>
  )
}

export function StaartdelingModule({ profile, onExit }: ModuleProps) {
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [problem, setProblem] = useState(() => generateProblem(level))
  const [stepIndex, setStepIndex] = useState(0)
  const [buffer, setBuffer] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  const done = stepIndex >= problem.steps.length
  const model = useMemo(() => buildModel(problem, stepIndex), [problem, stepIndex])
  const activeStep = done ? null : problem.steps[stepIndex]

  function pressDigit(d: string) {
    if (done) return
    playClick()
    setBuffer((b) => (b.length < 4 ? b + d : b))
  }

  function backspace() {
    setBuffer((b) => b.slice(0, -1))
  }

  function confirm() {
    if (!activeStep || buffer.length === 0) return
    const value = parseInt(buffer, 10)
    if (value === activeStep.expected) {
      playClick()
      setBuffer('')
      setHint(null)
      setAttempts(0)
      const nextIndex = stepIndex + 1
      setStepIndex(nextIndex)
      if (nextIndex >= problem.steps.length) {
        // Hele deling afgewerkt!
        const progress = recordAnswer(profile.id, MODULE_ID, true, {
          maxLevel: MAX_LEVEL,
          streakToLevelUp: 3,
        })
        setLevel(progress.level)
        playCorrect()
        setStarTrigger((n) => n + 1)
      }
    } else {
      playWrong()
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      setBuffer('')
      setHint(
        nextAttempts >= 2
          ? strongHintFor(activeStep, problem.deler)
          : hintFor(activeStep, problem.deler),
      )
    }
  }

  function nextProblem() {
    setProblem(generateProblem(level))
    setStepIndex(0)
    setBuffer('')
    setHint(null)
    setAttempts(0)
  }

  const stepLabel = !activeStep
    ? ''
    : activeStep.kind === 'quotient'
      ? `Hoeveel keer gaat ${problem.deler} in ${activeStep.current}?`
      : activeStep.kind === 'product'
        ? `Reken uit: ${activeStep.quotientDigit} × ${problem.deler}`
        : activeStep.kind === 'subtract'
          ? 'Trek af. Wat blijft er over?'
          : 'Welk cijfer zakt er?'

  return (
    <div className="screen">
      <BackHeader
        title="Staartdelingen"
        onBack={onExit}
        right={<StarCount profileId={profile.id} />}
      />

      <p style={{ textAlign: 'center', color: 'var(--text-soft)', margin: '0 0 8px' }}>
        Niveau {level} · {problem.deeltal} : {problem.deler}
      </p>

      {/* Het werkblad in klassieke staartdelingsnotatie */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '8px 0 12px',
          overflowX: 'auto',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            padding: 16,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <div style={{ display: 'flex' }}>
            {/* Linkerdeel: deeltal en rekenwerk */}
            <div>
              <div style={{ display: 'flex' }}>
                <CellRow
                  cells={model.deeltalCells}
                  activeEndCol={undefined}
                  buffer=""
                />
              </div>
              {model.rows.map((row, i) => (
                <div key={i} style={{ display: 'flex' }}>
                  <CellRow cells={row.cells} activeEndCol={row.activeEndCol} buffer={buffer} />
                </div>
              ))}
            </div>

            {/* Rechterdeel: deler bovenaan, quotiënt eronder */}
            <div style={{ borderLeft: '3px solid var(--text)', paddingLeft: 12, marginLeft: 8 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  height: CELL,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '3px solid var(--text)',
                  paddingRight: 8,
                }}
              >
                {problem.deler}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  height: CELL,
                  display: 'flex',
                  alignItems: 'center',
                  color: model.activeArea === 'quotient' ? 'var(--accent)' : 'inherit',
                }}
              >
                {model.quotient}
                {model.activeArea === 'quotient' && (
                  <span
                    style={{
                      background: 'var(--accent-soft)',
                      borderRadius: 6,
                      minWidth: 28,
                      textAlign: 'center',
                    }}
                  >
                    {buffer || '▢'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!done && (
        <>
          <p style={{ textAlign: 'center', fontWeight: 700, margin: '0 0 4px' }}>{stepLabel}</p>
          {hint && (
            <p
              style={{
                textAlign: 'center',
                background: 'var(--bad-soft)',
                borderRadius: 'var(--radius-small)',
                padding: '8px 12px',
                margin: '4px auto',
                maxWidth: 420,
              }}
            >
              💡 {hint}
            </p>
          )}

          {/* Numeriek toetsenblok */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 72px)',
              gap: 8,
              justifyContent: 'center',
              marginTop: 8,
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <BigButton key={d} variant="soft" style={{ fontSize: '1.5rem' }} onClick={() => pressDigit(d)}>
                {d}
              </BigButton>
            ))}
            <BigButton variant="ghost" style={{ fontSize: '1.3rem' }} onClick={backspace} aria-label="Wissen">
              ⌫
            </BigButton>
            <BigButton variant="soft" style={{ fontSize: '1.5rem' }} onClick={() => pressDigit('0')}>
              0
            </BigButton>
            <BigButton
              variant="accent"
              style={{ fontSize: '1.3rem' }}
              onClick={confirm}
              disabled={buffer.length === 0}
              aria-label="Bevestigen"
            >
              ✔
            </BigButton>
          </div>
        </>
      )}

      {done && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🎉</span>
          <div>
            Knap gedaan! {problem.deeltal} : {problem.deler} ={' '}
            <strong>{problem.quotient}</strong>
            {problem.rest > 0 && (
              <span>
                {' '}
                met rest <strong>{problem.rest}</strong>
              </span>
            )}
          </div>
          <BigButton variant="accent" onClick={nextProblem}>
            Nog een deling
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
