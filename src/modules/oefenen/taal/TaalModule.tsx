import { useEffect, useState } from 'react'
import type { Profile } from '../../../core/profiles'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { speak } from '../../../core/speech'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { ReadAloudButton } from '../../../ui/ReadAloudButton'

export interface WoordPaar {
  nl: string
  doel: string
  emoji: string
}

interface TaalModuleProps {
  profile: Profile
  onExit: () => void
  moduleId: string
  lang: string
  title: string
  taalNaam: string
  woorden: WoordPaar[]
}

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

function newRound(woorden: WoordPaar[], prevWord: string | null): Round {
  const keuze = woorden.length > 1 ? woorden.filter((w) => w.nl !== prevWord) : woorden
  const entry = randomItem(keuze)
  const options = new Set<string>([entry.doel])
  while (options.size < 4) {
    options.add(randomItem(woorden).doel)
  }
  return { entry, options: shuffle([...options]) }
}

type Mode = 'oefenen' | 'woordenlijst'

export function TaalModule({ profile, onExit, moduleId, lang, title, taalNaam, woorden }: TaalModuleProps) {
  const [mode, setMode] = useState<Mode>('oefenen')
  const [round, setRound] = useState<Round>(() => newRound(woorden, null))
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  // Bij elke nieuwe ronde het Nederlandse woord voorlezen.
  useEffect(() => {
    if (mode === 'oefenen') speak(round.entry.nl, 'nl')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, mode])

  function kiesOptie(doel: string) {
    if (feedback) return
    const isCorrect = doel === round.entry.doel
    recordAnswer(profile, moduleId, isCorrect)
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
    } else {
      playWrong()
    }
    setFeedback(isCorrect ? 'good' : 'bad')
    // Altijd de juiste uitspraak laten horen, of het antwoord nu goed of fout was.
    speak(round.entry.doel, lang)
  }

  function next() {
    setRound(newRound(woorden, round.entry.nl))
    setFeedback(null)
  }

  return (
    <div className="screen">
      <BackHeader
        title={title}
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton
              variant="ghost"
              onClick={() => setMode(mode === 'oefenen' ? 'woordenlijst' : 'oefenen')}
              aria-label="Wissel modus"
            >
              {mode === 'oefenen' ? '📖' : '🎮'}
            </BigButton>
          </div>
        }
      />

      {mode === 'oefenen' && (
        <>
          <div style={{ textAlign: 'center', fontSize: '5rem', margin: '8px 0' }}>{round.entry.emoji}</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{round.entry.nl}</span>
            <ReadAloudButton text={round.entry.nl} lang="nl" />
          </div>

          <p style={{ textAlign: 'center', margin: '0 0 16px' }}>Wat is dit in het {taalNaam}?</p>

          {!feedback && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              {round.options.map((optie) => (
                <div key={optie} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BigButton variant="soft" style={{ minWidth: 200 }} onClick={() => kiesOptie(optie)}>
                    {optie}
                  </BigButton>
                  <ReadAloudButton text={optie} lang={lang} />
                </div>
              ))}
            </div>
          )}

          {feedback === 'good' && (
            <FeedbackPanel
              type="good"
              message={
                <span>
                  Juist! 🎉 <strong>{round.entry.doel}</strong>
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
                  Nog niet juist. Het is <strong>{round.entry.doel}</strong>.
                </span>
              }
              actionLabel="Volgende"
              onAction={next}
            />
          )}

          <StarBurst trigger={starTrigger} />
        </>
      )}

      {mode === 'woordenlijst' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {woorden.map((w) => (
            <div
              key={w.nl}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: 'var(--surface)',
                borderRadius: 12,
                boxShadow: 'var(--shadow)',
              }}
            >
              <span style={{ fontSize: '1.8rem', minWidth: 40, textAlign: 'center' }}>{w.emoji}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{w.nl}</span>
              <ReadAloudButton text={w.nl} lang="nl" />
              <span style={{ flex: 1 }}>{w.doel}</span>
              <ReadAloudButton text={w.doel} lang={lang} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
