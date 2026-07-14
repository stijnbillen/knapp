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

// Nederlandse klankgroepen van twee letters (lange klinkers en tweeklanken).
const DIGRAPHS = ['aa', 'ee', 'oo', 'uu', 'ie', 'ei', 'ij', 'ui', 'oe', 'ou', 'au', 'eu']

/**
 * Hoe klinkt deze letter in dit woord? Zit de letter in een klankgroep
 * (aa/oe/ei/…), dan lezen we die hele klank voor; een losse korte klinker
 * krijgt een h erachter zodat de stem "ah" i.p.v. de letternaam "aa" zegt.
 * Medeklinkers houden hun letternaam.
 */
function klankFor(letter: string, word: string): string {
  const idx = word.indexOf(letter)
  const after = word.slice(idx, idx + 2)
  const before = idx > 0 ? word.slice(idx - 1, idx + 1) : ''
  if (DIGRAPHS.includes(after)) return after
  if (DIGRAPHS.includes(before)) return before
  if ('aeiou'.includes(letter)) return `${letter}h`
  return letter
}

export function LettersModule({ profile, onExit }: ModuleProps) {
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [round, setRound] = useState(() => newRound(level))
  const [found, setFound] = useState<Set<string>>(new Set())
  const [shaking, setShaking] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [starTrigger, setStarTrigger] = useState(0)

  const klank = klankFor(round.targetLetter, round.entry.word)

  // Enkel de klank van de letter voorlezen bij elke nieuwe ronde.
  useEffect(() => {
    speak(klank)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  // Het woord in hoofdletters en in kleine letters, onder elkaar.
  const rows = [round.entry.word.toUpperCase(), round.entry.word.toLowerCase()]

  function tapLetter(row: number, index: number) {
    const key = `${row}-${index}`
    if (done || found.has(key)) return
    const letter = round.entry.word[index]
    if (letter === round.targetLetter) {
      playPop()
      const nextFound = new Set(found).add(key)
      setFound(nextFound)
      if (nextFound.size === round.targetCount * rows.length) {
        // Alle doelletters gevonden (in beide rijen): ronde geslaagd
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
      setShaking(key)
      setTimeout(() => setShaking(null), 450)
    }
  }

  function next() {
    setRound(newRound(level))
    setFound(new Set())
    setDone(false)
  }

  const letterChip = (text: string) => (
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
      {text}
    </span>
  )

  return (
    <div className="screen">
      <BackHeader title="Letters" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>
          👆 Tik alle letters {letterChip(round.targetLetter.toUpperCase())}{' '}
          {letterChip(round.targetLetter)} aan
        </span>
        <ReadAloudButton text={klank} />
      </div>

      <div style={{ textAlign: 'center', fontSize: '6rem', margin: '16px 0 8px', lineHeight: 1 }}>
        {round.entry.emoji}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0' }}>
        {rows.map((rowWord, row) => (
          <div
            key={row}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {rowWord.split('').map((letter, index) => {
              const key = `${row}-${index}`
              const isFound = found.has(key)
              return (
                <button
                  key={key}
                  className={shaking === key ? 'shake' : ''}
                  onClick={() => tapLetter(row, index)}
                  style={{
                    minWidth: 52,
                    minHeight: 60,
                    borderRadius: 14,
                    fontSize: '2rem',
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
        ))}
      </div>

      {done && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">🎉</span>
          <div>
            Super! Je vond alle letters <strong>{round.targetLetter.toUpperCase()}</strong> en{' '}
            <strong>{round.targetLetter}</strong>!
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
