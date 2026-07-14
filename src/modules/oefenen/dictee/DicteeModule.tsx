import { useEffect, useRef, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { speak, speechAvailable } from '../../../core/speech'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import WORDS from './dictee-woorden.json'

const MODULE_ID = 'dictee'

interface DicteeEntry {
  woord: string
  cat: string
}

// Uitleg per spellingcategorie, getoond bij een fout antwoord.
const HINTS: Record<string, string> = {
  eeuw: "Je hoort 'eeuw': dat schrijf je als e-e-u-w.",
  ieuw: "Je hoort 'ieuw': dat schrijf je als i-e-u-w.",
  ui: 'Luister goed: hier zit de ui-klank in.',
  ch: 'Denk aan ch of cht in dit woord.',
  aai: 'Dit is een aai-woord: a-a-i.',
  ooi: 'Dit is een ooi-woord: o-o-i.',
  oei: 'Dit is een oei-woord: o-e-i.',
  g: "Let op de g — op het einde klinkt -ig als 'ug', maar je schrijft -ig.",
  leen: 'Banaanwoord! Het komt uit een andere taal: je schrijft het anders dan je het hoort.',
  eij: 'Let op: is het de korte ei of de lange ij?',
  sch: 'Denk aan sch of schr vooraan.',
}

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function DicteeModule({ profile, onExit }: ModuleProps) {
  const [entry, setEntry] = useState<DicteeEntry>(() => randomItem(WORDS as DicteeEntry[]))
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Woord voorlezen bij elke nieuwe ronde
  useEffect(() => {
    speak(entry.woord)
  }, [entry])

  function check() {
    if (feedback || !typed.trim()) return
    const isCorrect = typed.trim().toLowerCase() === entry.woord
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
      setEntry(randomItem(WORDS as DicteeEntry[]))
    }
    setTyped('')
    setFeedback(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="screen">
      <BackHeader title="Dictee" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      {!speechAvailable() && (
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
          ⚠️ Dit toestel kan niet voorlezen — het dictee heeft een stem nodig.
        </p>
      )}

      <p style={{ textAlign: 'center', fontWeight: 700, margin: '8px 0', fontSize: '1.15rem' }}>
        🎧 Luister goed en typ het woord
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px' }}>
        <BigButton variant="soft" style={{ minWidth: 180 }} onClick={() => speak(entry.woord)}>
          🔊 Zeg het nog eens
        </BigButton>
      </div>

      {!feedback && (
        <form
          style={{ display: 'flex', justifyContent: 'center', gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            check()
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
              width: 220,
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
              Juist! <strong>{entry.woord}</strong> 🎉
            </span>
          }
          actionLabel="Volgende"
          onAction={next}
        />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message={
            <span>
              {HINTS[entry.cat] ?? 'Luister nog eens goed.'}
              <br />
              Het juiste woord is: <strong>{entry.woord}</strong>
            </span>
          }
          actionLabel="Probeer opnieuw"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
