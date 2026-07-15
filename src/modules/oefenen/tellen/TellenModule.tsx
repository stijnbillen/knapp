import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { getModuleProgress, recordAnswer } from '../../../core/progress'
import { playCorrect, playPop, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { ReadAloudButton } from '../../../ui/ReadAloudButton'

const MODULE_ID = 'tellen'
const MAX_LEVEL = 4

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
  mode: 'count' | 'tap'
  item: (typeof ITEM_SETS)[number]
  target: number // het juiste aantal
  shown: number // aantal getoonde voorwerpen (bij 'tap' meer dan target)
  options: number[] // antwoordknoppen (alleen bij 'count')
}

function newRound(level: number): Round {
  const item = ITEM_SETS[randomInt(0, ITEM_SETS.length - 1)]

  if (level >= 4) {
    // Variant: "tik precies N voorwerpen aan"
    const target = randomInt(3, 8)
    return { mode: 'tap', item, target, shown: target + randomInt(2, 4), options: [] }
  }

  const max = level === 1 ? 5 : level === 2 ? 10 : 20
  const min = level === 3 ? 8 : 1
  const target = randomInt(min, max)

  // 3–4 antwoordopties rond het juiste getal
  const options = new Set<number>([target])
  while (options.size < 4) {
    const distractor = target + randomInt(-3, 3)
    if (distractor >= 1 && distractor <= max + 2) options.add(distractor)
  }
  return { mode: 'count', item, target, shown: target, options: shuffle([...options]) }
}

function instructionText(round: Round): string {
  return round.mode === 'count'
    ? `Hoeveel ${round.item.name} zie je? Tik het juiste getal aan.`
    : `Tik precies ${round.target} ${round.item.name} aan.`
}

export function TellenModule({ profile, onExit }: ModuleProps) {
  const [level, setLevel] = useState(() => getModuleProgress(profile.id, MODULE_ID).level)
  const [round, setRound] = useState(() => newRound(level))
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function handleResult(isCorrect: boolean) {
    const progress = recordAnswer(profile, MODULE_ID, isCorrect, { maxLevel: MAX_LEVEL })
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
      setFeedback('good')
      setLevel(progress.level)
    } else {
      playWrong()
      setFeedback('bad')
    }
  }

  function chooseNumber(n: number) {
    if (feedback) return
    handleResult(n === round.target)
  }

  function toggleItem(index: number) {
    if (feedback) return
    playPop()
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function checkTapRound() {
    if (feedback) return
    handleResult(selected.size === round.target)
  }

  function next() {
    if (feedback === 'good') {
      setRound(newRound(level))
      setSelected(new Set())
    }
    setFeedback(null)
  }

  return (
    <div className="screen">
      <BackHeader title="Tellen" onBack={onExit} right={<StarCount profileId={profile.id} />} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.6rem' }}>{round.mode === 'count' ? '🔢' : '👆'}</span>
        <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>
          {round.mode === 'count' ? 'Hoeveel zie je?' : `Tik er precies ${round.target} aan`}
        </span>
        <ReadAloudButton text={instructionText(round)} />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignContent: 'center',
          gap: 6,
          fontSize: '2.6rem',
          margin: '20px 0',
          minHeight: 140,
        }}
      >
        {Array.from({ length: round.shown }, (_, i) =>
          round.mode === 'tap' ? (
            <button
              key={i}
              onClick={() => toggleItem(i)}
              style={{
                fontSize: 'inherit',
                minWidth: 'var(--tap)',
                minHeight: 'var(--tap)',
                borderRadius: 12,
                background: selected.has(i) ? 'var(--accent-soft)' : 'transparent',
                outline: selected.has(i) ? '3px solid var(--accent)' : 'none',
              }}
            >
              {round.item.emoji}
            </button>
          ) : (
            <span key={i}>{round.item.emoji}</span>
          ),
        )}
      </div>

      {!feedback && round.mode === 'count' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {round.options.map((n) => (
            <BigButton
              key={n}
              variant="soft"
              style={{ fontSize: '1.8rem', minWidth: 72, minHeight: 72 }}
              onClick={() => chooseNumber(n)}
            >
              {n}
            </BigButton>
          ))}
        </div>
      )}

      {!feedback && round.mode === 'tap' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BigButton variant="accent" style={{ minWidth: 160 }} onClick={checkTapRound}>
            ✔ Klaar!
          </BigButton>
        </div>
      )}

      {feedback === 'good' && (
        <FeedbackPanel type="good" message="Goed geteld! 🎉" actionLabel="Volgende" onAction={next} />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message={
            round.mode === 'count'
              ? 'Tel nog eens rustig, één voor één. Je kan het!'
              : `Kijk nog eens: je moet er precies ${round.target} aantikken.`
          }
          actionLabel="Probeer opnieuw"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
