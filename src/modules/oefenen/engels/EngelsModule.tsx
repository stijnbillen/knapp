import { useEffect, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { speak } from '../../../core/speech'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { ReadAloudButton } from '../../../ui/ReadAloudButton'
import WOORDEN from './engels-woorden.json'

const MODULE_ID = 'engels'

interface WoordPaar {
  nl: string
  en: string
  emoji: string
}

const WOORDEN_LIJST = WOORDEN as WoordPaar[]

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Round {
  entry: WoordPaar
  options: string[]
}

function newRound(prevWord: string | null): Round {
  const keuze = WOORDEN_LIJST.length > 1 ? WOORDEN_LIJST.filter((w) => w.nl !== prevWord) : WOORDEN_LIJST
  const entry = randomItem(keuze)
  const options = new Set<string>([entry.en])
  while (options.size < 4) {
    options.add(randomItem(WOORDEN_LIJST).en)
  }
  return { entry, options: shuffle([...options]) }
}

export function EngelsModule({ profile, onExit }: ModuleProps) {
  const [round, setRound] = useState<Round>(() => newRound(null))
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  // Bij elke nieuwe ronde het Nederlandse woord voorlezen.
  useEffect(() => {
    speak(round.entry.nl, 'nl')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  function kiesOptie(en: string) {
    if (feedback) return
    const isCorrect = en === round.entry.en
    recordAnswer(profile.id, MODULE_ID, isCorrect)
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
    } else {
      playWrong()
    }
    setFeedback(isCorrect ? 'good' : 'bad')
    // Altijd de juiste Engelse uitspraak laten horen, of het antwoord nu goed of fout was.
    speak(round.entry.en, 'en')
  }

  function next() {
    setRound(newRound(round.entry.nl))
    setFeedback(null)
  }

  return (
    <div className="screen">
      <BackHeader title="Eerste les Engels" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <div style={{ textAlign: 'center', fontSize: '5rem', margin: '8px 0' }}>{round.entry.emoji}</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{round.entry.nl}</span>
        <ReadAloudButton text={round.entry.nl} lang="nl" />
      </div>

      <p style={{ textAlign: 'center', margin: '0 0 16px' }}>Hoe zeg je dit in het Engels?</p>

      {!feedback && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {round.options.map((optie) => (
            <BigButton key={optie} variant="soft" style={{ minWidth: 220 }} onClick={() => kiesOptie(optie)}>
              {optie}
            </BigButton>
          ))}
        </div>
      )}

      {feedback === 'good' && (
        <FeedbackPanel
          type="good"
          message={
            <span>
              Juist! 🎉 <strong>{round.entry.en}</strong>
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
              Nog niet juist. Het is <strong>{round.entry.en}</strong>.
            </span>
          }
          actionLabel="Volgende"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
