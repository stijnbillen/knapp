import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { ReadAloudButton } from '../../../ui/ReadAloudButton'

const MODULE_ID = 'optellen'
const MAX_LEVEL = 3

const ITEM_SETS = [
  { emoji: '🍎', name: 'appels' },
  { emoji: '🎈', name: 'ballonnen' },
  { emoji: '🐟', name: 'visjes' },
  { emoji: '🌸', name: 'bloemen' },
  { emoji: '🦆', name: 'eendjes' },
  { emoji: '⭐', name: 'sterren' },
]

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle<T>(list: T[]): T[] {
  return [...list].sort(() => Math.random() - 0.5)
}

interface Round {
  item: (typeof ITEM_SETS)[number]
  a: number
  b: number
  sum: number
  options: number[]
}

function newRound(level: number): Round {
  const item = ITEM_SETS[randomInt(0, ITEM_SETS.length - 1)]
  const [aMax, bMax] = level === 1 ? [3, 3] : level === 2 ? [5, 5] : [6, 8]
  const a = randomInt(1, aMax)
  const b = randomInt(1, bMax)
  const sum = a + b

  const options = new Set<number>([sum])
  while (options.size < 3) {
    const distractor = sum + randomInt(-3, 3)
    if (distractor >= 1 && distractor !== sum) options.add(distractor)
  }
  return { item, a, b, sum, options: shuffle([...options]) }
}

export function OptellenModule({ profile, onExit }: ModuleProps) {
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [round, setRound] = useState(() => newRound(level))
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function choose(value: number) {
    if (feedback) return
    const isCorrect = value === round.sum
    const progress = recordAnswer(profile, MODULE_ID, isCorrect, {
      maxLevel: MAX_LEVEL,
      streakToLevelUp: 4,
    })
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
      setLevel(progress.level)
      setFeedback('good')
    } else {
      playWrong()
      setFeedback('bad')
    }
  }

  function next() {
    if (feedback === 'good') {
      setRound(newRound(level))
    }
    setFeedback(null)
  }

  const sentence = `${round.a} ${round.item.name} + ${round.b} ${round.item.name} = ?? ${round.item.name}`

  return (
    <div className="screen">
      <BackHeader title="Optellen" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: '2rem',
          margin: '20px 0 8px',
        }}
      >
        <span>{round.item.emoji.repeat(round.a)}</span>
        <span style={{ fontSize: '1.4rem' }}>+</span>
        <span>{round.item.emoji.repeat(round.b)}</span>
        <span style={{ fontSize: '1.4rem' }}>=</span>
        <span>❓</span>
      </div>

      <p
        style={{
          textAlign: 'center',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {sentence}
        <ReadAloudButton text={sentence.replace('??', 'hoeveel')} />
      </p>

      {!feedback && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
          {round.options.map((option) => (
            <BigButton
              key={option}
              variant="soft"
              style={{
                flexDirection: 'column',
                gap: 4,
                minWidth: 96,
                minHeight: 96,
                fontSize: '1rem',
              }}
              onClick={() => choose(option)}
            >
              <span style={{ fontSize: '1.6rem', fontWeight: 700 }}>{option}</span>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{round.item.emoji.repeat(option)}</span>
            </BigButton>
          ))}
        </div>
      )}

      {feedback === 'good' && (
        <FeedbackPanel type="good" message="Goed gerekend! 🎉" actionLabel="Volgende" onAction={next} />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message="Tel nog eens rustig, één voor één. Je kan het!"
          actionLabel="Probeer opnieuw"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
