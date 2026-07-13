import { useEffect, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playCorrect, playPop, playWrong } from '../../../core/audio'
import { speak } from '../../../core/speech'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { ReadAloudButton } from '../../../ui/ReadAloudButton'
import { BigButton } from '../../../ui/BigButton'
import WORDS from './letter-woorden.json'

const MODULE_ID = 'letters'
const MAX_LEVEL = 3

interface WordEntry {
  word: string
  emoji: string
}

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

/** Niveau bepaalt woordlengte: 1 = kort (≤3), 2 = middel (4–5), 3 = lang (6+). */
function wordsForLevel(level: number): WordEntry[] {
  const all = WORDS as WordEntry[]
  const filtered = all.filter((w) =>
    level === 1 ? w.word.length <= 3 : level === 2 ? w.word.length <= 5 : true,
  )
  return filtered.length > 0 ? filtered : all
}

interface Round {
  entry: WordEntry
  targetLetter: string
  targetCount: number
}

function newRound(level: number): Round {
  const entry = randomItem(wordsForLevel(level))
  const letters = [...new Set(entry.word.split(''))]
  const targetLetter = randomItem(letters)
  const targetCount = entry.word.split('').filter((l) => l === targetLetter).length
  return { entry, targetLetter, targetCount }
}

function instructionText(round: Round): string {
  return `Tik alle letters ${round.targetLetter} aan in het woord ${round.entry.word}.`
}

export function LettersModule({ profile, onExit }: ModuleProps) {
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [round, setRound] = useState(() => newRound(level))
  const [found, setFound] = useState<Set<number>>(new Set())
  const [shaking, setShaking] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)

  // Opdracht voorlezen bij elke nieuwe ronde (weinig leestekst voor 5 jaar).
  useEffect(() => {
    speak(instructionText(round))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  function tapLetter(index: number) {
    if (done || found.has(index)) return
    const letter = round.entry.word[index]
    if (letter === round.targetLetter) {
      playPop()
      const nextFound = new Set(found).add(index)
      setFound(nextFound)
      if (nextFound.size === round.targetCount) {
        // Alle doelletters gevonden: ronde geslaagd
        const progress = recordAnswer(profile.id, MODULE_ID, true, {
          maxLevel: MAX_LEVEL,
          streakToLevelUp: 5,
        })
        setLevel(progress.level)
        playCorrect()
        setStarTrigger((n) => n + 1)
        setDone(true)
      }
    } else {
      playWrong()
      setShaking(index)
      setTimeout(() => setShaking(null), 450)
    }
  }

  function next() {
    setRound(newRound(level))
    setFound(new Set())
    setDone(false)
  }

  return (
    <div className="screen">
      <BackHeader title="Letters" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>
          👆 Tik alle letters{' '}
          <span
            style={{
              display: 'inline-block',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: 10,
              padding: '2px 12px',
              fontSize: '1.4rem',
            }}
          >
            {round.targetLetter}
          </span>{' '}
          aan
        </span>
        <ReadAloudButton text={instructionText(round)} />
      </div>

      <div style={{ textAlign: 'center', fontSize: '6rem', margin: '16px 0 8px', lineHeight: 1 }}>
        {round.entry.emoji}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
          margin: '16px 0',
        }}
      >
        {round.entry.word.split('').map((letter, index) => {
          const isFound = found.has(index)
          return (
            <button
              key={index}
              className={shaking === index ? 'shake' : ''}
              onClick={() => tapLetter(index)}
              style={{
                minWidth: 56,
                minHeight: 64,
                borderRadius: 14,
                fontSize: '2.2rem',
                fontWeight: 700,
                background: isFound ? 'var(--good-soft)' : 'var(--surface)',
                color: isFound ? 'var(--good)' : 'var(--text)',
                boxShadow: 'var(--shadow)',
                border: isFound ? '3px solid var(--good)' : '3px solid transparent',
              }}
            >
              {letter}
            </button>
          )
        })}
      </div>

      {done && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🎉</span>
          <div>
            Super! Je vond alle letters <strong>{round.targetLetter}</strong>!
          </div>
          <BigButton variant="accent" onClick={next}>
            Volgende
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
