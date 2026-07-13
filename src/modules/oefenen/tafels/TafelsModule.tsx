import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import type { Operation, TableProblem } from './tables'
import { generateOptions, generateProblem } from './tables'

const MODULE_ID = 'tafels'
const ALL_TABLES = Array.from({ length: 10 }, (_, i) => i + 1)

const OPERATIONS: { id: Operation; label: string }[] = [
  { id: 'maal', label: '✖️ Maaltafels' },
  { id: 'deel', label: '➗ Deeltafels' },
  { id: 'mix', label: '🔀 Mix' },
]

interface Round {
  problem: TableProblem
  options: number[]
}

function newRound(tables: number[], operation: Operation): Round {
  const problem = generateProblem(tables, operation)
  return { problem, options: generateOptions(problem.answer) }
}

export function TafelsModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<'settings' | 'quiz'>('settings')
  const [operation, setOperation] = useState<Operation>('maal')
  const [tables, setTables] = useState<number[]>(ALL_TABLES)
  const [round, setRound] = useState<Round | null>(null)
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function toggleTable(n: number) {
    setTables((current) =>
      current.includes(n)
        ? current.filter((t) => t !== n)
        : [...current, n].sort((a, b) => a - b),
    )
  }

  function start() {
    setRound(newRound(tables, operation))
    setFeedback(null)
    setPhase('quiz')
  }

  function answer(value: number) {
    if (feedback || !round) return
    const isCorrect = value === round.problem.answer
    recordAnswer(profile.id, MODULE_ID, isCorrect)
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
      setFeedback('good')
    } else {
      playWrong()
      setFeedback('bad')
    }
  }

  function next() {
    if (feedback === 'good') {
      setRound(newRound(tables, operation))
    }
    setFeedback(null)
  }

  if (phase === 'settings') {
    return (
      <div className="screen">
        <BackHeader title="Tafels" onBack={onExit} />

        <div className="form-field">
          <label>Wat wil je oefenen?</label>
          <div className="picker-grid">
            {OPERATIONS.map((op) => (
              <BigButton
                key={op.id}
                variant={op.id === operation ? 'accent' : 'soft'}
                onClick={() => setOperation(op.id)}
              >
                {op.label}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Welke tafels?</label>
          <div className="picker-grid">
            {ALL_TABLES.map((n) => (
              <button
                key={n}
                className={`picker-option ${tables.includes(n) ? 'picker-option--selected' : ''}`}
                onClick={() => toggleTable(n)}
                aria-label={`Tafel van ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <BigButton variant="accent" onClick={start} disabled={tables.length === 0}>
          ▶️ Start
        </BigButton>
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader
        title="Tafels"
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton variant="ghost" onClick={() => setPhase('settings')} aria-label="Instellingen">
              ⚙️
            </BigButton>
          </div>
        }
      />

      {round && (
        <>
          <p style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, margin: '24px 0' }}>
            {round.problem.question}
          </p>

          {!feedback && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              {round.options.map((option) => (
                <BigButton
                  key={option}
                  variant="soft"
                  style={{ fontSize: '1.4rem', minWidth: 72 }}
                  onClick={() => answer(option)}
                >
                  {option}
                </BigButton>
              ))}
            </div>
          )}

          {feedback === 'good' && (
            <FeedbackPanel type="good" message="Juist! 🎉" actionLabel="Volgende" onAction={next} />
          )}
          {feedback === 'bad' && (
            <FeedbackPanel
              type="bad"
              message="Nog niet helemaal. Probeer nog eens."
              actionLabel="Probeer opnieuw"
              onAction={next}
            />
          )}
        </>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
