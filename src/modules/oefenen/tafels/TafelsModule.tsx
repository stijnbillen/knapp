import { useEffect, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playClick, playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { NumericKeypad } from '../../../ui/NumericKeypad'
import type { Operation, TableProblem } from './tables'
import { generateProblem } from './tables'

const MODULE_ID = 'tafels'
const ALL_TABLES = Array.from({ length: 10 }, (_, i) => i + 1)

const OPERATIONS: { id: Operation; label: string }[] = [
  { id: 'maal', label: '✖️ Maaltafels' },
  { id: 'deel', label: '➗ Deeltafels' },
  { id: 'mix', label: '🔀 Mix' },
]

export function TafelsModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<'settings' | 'quiz'>('settings')
  const [operation, setOperation] = useState<Operation>('maal')
  const [tables, setTables] = useState<number[]>(ALL_TABLES)
  const [problem, setProblem] = useState<TableProblem | null>(null)
  const [buffer, setBuffer] = useState('')
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
    setProblem(generateProblem(tables, operation))
    setBuffer('')
    setFeedback(null)
    setPhase('quiz')
  }

  function pressDigit(d: string) {
    if (feedback) return
    playClick()
    setBuffer((b) => (b.length < 3 ? b + d : b))
  }

  function backspace() {
    if (feedback) return
    setBuffer((b) => b.slice(0, -1))
  }

  function confirm() {
    if (feedback || !problem || buffer.length === 0) return
    const isCorrect = parseInt(buffer, 10) === problem.answer
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
      setProblem(generateProblem(tables, operation))
    }
    setBuffer('')
    setFeedback(null)
  }

  // Bij een juist antwoord meteen door naar de volgende som, geen extra klik nodig.
  useEffect(() => {
    if (feedback !== 'good') return
    const timer = setTimeout(next, 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback])

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

      {problem && (
        <>
          <p style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, margin: '24px 0 8px' }}>
            {problem.question.replace('?', buffer || '▢')}
          </p>

          {!feedback && (
            <NumericKeypad buffer={buffer} onDigit={pressDigit} onBackspace={backspace} onConfirm={confirm} />
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
