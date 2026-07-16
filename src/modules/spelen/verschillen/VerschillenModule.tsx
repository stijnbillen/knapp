import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'

const GAME_ID = 'verschillen'

const EMOJI = [
  '🍎', '🍌', '🍇', '🍓', '🐶', '🐱', '🐸', '🦆', '⭐', '🌸',
  '⚽', '🎈', '🚗', '🐟', '🦋', '🌳', '🍄', '⛵', '🎁', '🧸',
]

const DIFFICULTIES = [
  { label: '😌 Makkelijk', cols: 4, rows: 4, items: 8, diffs: 3, multiplier: 1 },
  { label: '🙂 Middel', cols: 5, rows: 5, items: 14, diffs: 5, multiplier: 2 },
  { label: '😈 Moeilijk', cols: 6, rows: 6, items: 22, diffs: 7, multiplier: 3 },
]

type Phase = 'start' | 'playing' | 'done'

interface Scene {
  cols: number
  rows: number
  top: (string | null)[]
  bottom: (string | null)[]
  diffs: number[] // celindexen waar de panelen verschillen
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function otherEmoji(current: string): string {
  for (;;) {
    const pick = EMOJI[randomInt(EMOJI.length)]
    if (pick !== current) return pick
  }
}

function generateScene(conf: (typeof DIFFICULTIES)[number]): Scene {
  const cellCount = conf.cols * conf.rows
  const top: (string | null)[] = Array(cellCount).fill(null)

  // Vul willekeurige cellen met emoji
  const slots = Array.from({ length: cellCount }, (_, i) => i).sort(() => Math.random() - 0.5)
  slots.slice(0, conf.items).forEach((slot) => {
    top[slot] = EMOJI[randomInt(EMOJI.length)]
  })

  // Kopieer en breng verschillen aan: wissel, verwijder of voeg toe
  const bottom = [...top]
  const diffs = slots.slice(0, conf.diffs + conf.items).sort(() => Math.random() - 0.5).slice(0, conf.diffs)
  diffs.forEach((slot) => {
    const current = bottom[slot]
    if (current === null) {
      bottom[slot] = EMOJI[randomInt(EMOJI.length)]
    } else if (Math.random() < 0.5) {
      bottom[slot] = otherEmoji(current)
    } else {
      bottom[slot] = null
    }
  })

  return { cols: conf.cols, rows: conf.rows, top, bottom, diffs }
}

export function VerschillenModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [difficulty, setDifficulty] = useState(0)
  const [scene, setScene] = useState<Scene | null>(null)
  const [found, setFound] = useState<Set<number>>(new Set())
  const [misses, setMisses] = useState(0)
  const [shake, setShake] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)
  const [klaar, setKlaar] = useState(false)

  const conf = DIFFICULTIES[difficulty]

  function start(index: number) {
    setDifficulty(index)
    setScene(generateScene(DIFFICULTIES[index]))
    setFound(new Set())
    setMisses(0)
    setKlaar(false)
    setPhase('playing')
  }

  function tapCell(index: number) {
    if (!scene || phase !== 'playing' || klaar) return
    if (found.has(index)) return

    if (scene.diffs.includes(index)) {
      playPop()
      const next = new Set(found)
      next.add(index)
      setFound(next)
      if (next.size >= scene.diffs.length) {
        // Alles gevonden: score = 10 per verschil, min 2 per misser, keer moeilijkheid
        const base = scene.diffs.length * 10 - misses * 2
        const score = Math.max(scene.diffs.length, base) * conf.multiplier
        setFinalScore(score)
        setIsRecord(submitScore(GAME_ID, profile, score))
        playStar()
        setKlaar(true)
        // Even de opgeloste platen tonen voor we naar het scorebord gaan.
        setTimeout(() => setPhase('done'), 1400)
      }
    } else {
      playWrong()
      setMisses((m) => m + 1)
      setShake((n) => n + 1)
    }
  }

  function panel(cells: (string | null)[], key: string) {
    return (
      <div
        key={key}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${scene!.cols}, 1fr)`,
          // Ook begrensd op hoogte zodat beide panelen samen op één scherm passen
          width: 'min(90vw, 420px, 36dvh)',
          aspectRatio: `${scene!.cols} / ${scene!.rows}`,
          background: 'var(--surface)',
          borderRadius: 12,
          boxShadow: 'var(--shadow)',
          userSelect: 'none',
        }}
      >
        {cells.map((emoji, i) => (
          <button
            key={i}
            onClick={() => tapCell(i)}
            aria-label={`Vakje ${i + 1}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `min(${300 / scene!.cols}px, 2rem)`,
              lineHeight: 1,
              borderRadius: 8,
              outline: found.has(i) ? '3px solid var(--good)' : 'none',
              outlineOffset: -3,
              background: found.has(i) ? 'var(--good-soft)' : 'transparent',
            }}
          >
            {emoji ?? ''}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader
        title="Verschillen"
        onBack={onExit}
        right={
          phase === 'playing' && scene ? (
            <span className="star-count">
              🔍 {found.size}/{scene.diffs.length}
            </span>
          ) : undefined
        }
      />

      {phase === 'start' && (
        <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ fontSize: '4rem' }}>🔍</span>
          <p style={{ textAlign: 'center', maxWidth: 320 }}>
            De twee platen lijken op elkaar, maar niet helemaal! Tik de vakjes aan die verschillen.
          </p>
          {DIFFICULTIES.map((d, i) => (
            <BigButton
              key={d.label}
              variant={i === 0 ? 'accent' : 'soft'}
              style={{ minWidth: 220 }}
              onClick={() => start(i)}
            >
              {d.label} · {d.diffs} verschillen
            </BigButton>
          ))}
        </div>
      )}

      {phase === 'playing' && scene && (
        <div
          key={shake}
          className={shake > 0 ? 'shake' : ''}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}
        >
          {klaar && (
            <p style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              🎉 Alles gevonden!
            </p>
          )}
          {panel(scene.top, 'top')}
          {panel(scene.bottom, 'bottom')}
        </div>
      )}

      {phase === 'done' && (
        <div className="screen">
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
            🔍 Alles gevonden!
          </p>
          <HighscorePanel
            gameId={GAME_ID}
            profile={profile}
            score={finalScore}
            isRecord={isRecord}
            actionLabel="Nog eens spelen"
            onAction={() => setPhase('start')}
          />
        </div>
      )}
    </div>
  )
}
