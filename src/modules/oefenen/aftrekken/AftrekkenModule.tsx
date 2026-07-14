import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playClick, playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'
import type { SubtractionProblem } from './subtraction'
import { generateProblem, hintFor, strongHintFor } from './subtraction'

const MODULE_ID = 'aftrekken'
const MAX_LEVEL = 4
const CELL = 44 // px per cijferkolom

export function AftrekkenModule({ profile, onExit }: ModuleProps) {
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [problem, setProblem] = useState<SubtractionProblem>(() => generateProblem(level))
  const [colIndex, setColIndex] = useState(0) // 0 = rechtse kolom
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  const done = colIndex >= problem.digits

  function pressDigit(d: number) {
    if (done) return
    if (d === problem.expected[colIndex]) {
      playClick()
      setHint(null)
      setAttempts(0)
      const next = colIndex + 1
      setColIndex(next)
      if (next >= problem.digits) {
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
      setHint(nextAttempts >= 2 ? strongHintFor(problem, colIndex) : hintFor(problem, colIndex))
    }
  }

  function nextProblem() {
    setProblem(generateProblem(level))
    setColIndex(0)
    setAttempts(0)
    setHint(null)
  }

  // Cijfers per rij, links → rechts (kolom digits-1 … 0)
  const cols = Array.from({ length: problem.digits }, (_, i) => problem.digits - 1 - i)
  const digitAt = (n: number, col: number) => Math.floor(n / 10 ** col) % 10

  function cellStyle(extra: React.CSSProperties = {}): React.CSSProperties {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: CELL,
      height: CELL,
      fontSize: 26,
      fontWeight: 700,
      position: 'relative',
      ...extra,
    }
  }

  return (
    <div className="screen">
      <BackHeader title="Aftrekken" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <p style={{ textAlign: 'center', color: 'var(--text-soft)', margin: '0 0 8px' }}>
        Niveau {level} · reken kolom per kolom, van rechts naar links
      </p>

      {/* De som in kolomnotatie */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 12px' }}>
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            padding: '16px 20px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {/* Bovenste getal, met leen-markering */}
          <div style={{ display: 'flex', marginLeft: CELL }}>
            {cols.map((col) => (
              <span key={col} style={cellStyle()}>
                {digitAt(problem.a, col)}
                {/* Kolom rechts hiervan heeft geleend: toon “-1” als geheugensteun */}
                {col > 0 && problem.borrows[col - 1] && colIndex >= col - 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      left: 2,
                      fontSize: 12,
                      color: '#d33',
                      fontWeight: 800,
                    }}
                  >
                    −1
                  </span>
                )}
              </span>
            ))}
          </div>
          {/* Onderste getal met minteken */}
          <div style={{ display: 'flex' }}>
            <span style={cellStyle({ color: 'var(--text-soft)' })}>−</span>
            {cols.map((col) => (
              <span key={col} style={cellStyle()}>
                {digitAt(problem.b, col)}
              </span>
            ))}
          </div>
          <div style={{ borderTop: '3px solid var(--text)', marginTop: 4, paddingTop: 4 }}>
            {/* Antwoordrij */}
            <div style={{ display: 'flex', marginLeft: CELL }}>
              {cols.map((col) => {
                const isActive = col === colIndex && !done
                const isFilled = col < colIndex
                return (
                  <span
                    key={col}
                    style={cellStyle({
                      color: isActive ? 'var(--accent)' : isFilled ? 'var(--accent)' : 'inherit',
                      background: isActive ? 'var(--accent-soft)' : 'transparent',
                      borderRadius: 8,
                    })}
                  >
                    {isFilled ? problem.expected[col] : isActive ? '▢' : ''}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {!done && (
        <>
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
              gridTemplateColumns: 'repeat(5, 64px)',
              gap: 8,
              justifyContent: 'center',
              marginTop: 8,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
              <BigButton key={d} variant="soft" style={{ fontSize: '1.4rem' }} onClick={() => pressDigit(d)}>
                {d}
              </BigButton>
            ))}
          </div>
        </>
      )}

      {done && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🎉</span>
          <div>
            Helemaal juist! {problem.a} − {problem.b} = <strong>{problem.answer}</strong>
          </div>
          <BigButton variant="accent" onClick={nextProblem}>
            Nog een som
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
