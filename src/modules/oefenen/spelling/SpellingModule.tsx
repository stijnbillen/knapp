import { useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import WORDS from './spelling-woorden.json'

const MODULE_ID = 'spelling'

interface SpellingEntry {
  woord: string // het juiste woord
  fout: string // de foute spellingvariant
  gat: string // weergave met weggelaten stuk, bv. "bo?en"
  zin: string // contextzin met ___
  regel: 'lang' | 'kort' | 'samen'
}

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function shuffle<T>(list: T[]): T[] {
  return [...list].sort(() => Math.random() - 0.5)
}

function ruleExplanation(entry: SpellingEntry): string {
  switch (entry.regel) {
    case 'lang':
      return `Je hoort een lange klank. Bij een open lettergreep schrijf je dan maar één medeklinker: ${entry.woord}.`
    case 'kort':
      return `Je hoort een korte klank. Na een korte klank schrijf je een dubbele medeklinker: ${entry.woord}.`
    case 'samen':
      return `Dit is een samenstelling van twee woorden. Denk aan de tussenletters: ${entry.woord}.`
  }
}

interface Round {
  entry: SpellingEntry
  mode: 'keuze' | 'typen'
  options: string[]
}

function newRound(roundNumber: number): Round {
  const entry = randomItem(WORDS as SpellingEntry[])
  // Afwisselend meerkeuze en typen
  const mode = roundNumber % 2 === 0 ? 'keuze' : 'typen'
  return { entry, mode, options: shuffle([entry.woord, entry.fout]) }
}

export function SpellingModule({ profile, onExit }: ModuleProps) {
  const [roundNumber, setRoundNumber] = useState(0)
  const [round, setRound] = useState(() => newRound(0))
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  function answer(value: string) {
    if (feedback) return
    const isCorrect = value.trim().toLowerCase() === round.entry.woord
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
      const n = roundNumber + 1
      setRoundNumber(n)
      setRound(newRound(n))
      setTyped('')
    } else {
      // Opnieuw proberen met hetzelfde woord
      setTyped('')
      inputRef.current?.focus()
    }
    setFeedback(null)
  }

  const sentenceParts = round.entry.zin.split('___')

  return (
    <div className="screen">
      <BackHeader title="Spelling" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <p style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--text-soft)' }}>
        {round.mode === 'keuze' ? 'Kies de juiste spelling' : 'Typ het volledige woord'}
      </p>

      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: 20,
          textAlign: 'center',
          fontSize: '1.25rem',
          margin: '8px 0 16px',
        }}
      >
        {sentenceParts[0]}
        <strong style={{ color: 'var(--accent)' }}>{round.entry.gat}</strong>
        {sentenceParts[1]}
      </div>

      {!feedback && round.mode === 'keuze' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          {round.options.map((option) => (
            <BigButton
              key={option}
              variant="soft"
              style={{ fontSize: '1.4rem', minWidth: 140 }}
              onClick={() => answer(option)}
            >
              {option}
            </BigButton>
          ))}
        </div>
      )}

      {!feedback && round.mode === 'typen' && (
        <form
          style={{ display: 'flex', justifyContent: 'center', gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim()) answer(typed)
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Typ het woord"
            style={{
              fontSize: '1.4rem',
              padding: '10px 14px',
              borderRadius: 'var(--radius-small)',
              border: '2px solid var(--accent)',
              width: 200,
              textAlign: 'center',
            }}
          />
          <BigButton variant="accent" type="submit" disabled={!typed.trim()}>
            ✔
          </BigButton>
        </form>
      )}

      {feedback === 'good' && (
        <FeedbackPanel
          type="good"
          message={
            <span>
              Juist! <strong>{round.entry.woord}</strong> 🎉
            </span>
          }
          actionLabel="Volgende"
          onAction={next}
        />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message={ruleExplanation(round.entry)}
          actionLabel="Probeer opnieuw"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
