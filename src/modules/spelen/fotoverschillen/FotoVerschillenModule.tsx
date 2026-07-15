import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { submitScore } from '../../../core/highscores'
import { playPop, playStar, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { BigButton } from '../../../ui/BigButton'
import { HighscorePanel } from '../../../ui/HighscorePanel'
import PAREN_RAW from './paren.json'

const GAME_ID = 'fotoverschillen'

interface Verschil {
  x: number
  y: number
  r: number
  note: string
}

interface Paar {
  id: string
  diffs: Verschil[]
}

const PAREN = PAREN_RAW as Paar[]

const base = import.meta.env.BASE_URL

function fotoUrl(id: string, letter: 'a' | 'b'): string {
  return `${base}foto-verschillen/${id}-${letter}.png`
}

type Phase = 'start' | 'playing' | 'done'

function afstand(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

export function FotoVerschillenModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [paar, setPaar] = useState<Paar | null>(null)
  const [found, setFound] = useState<Set<number>>(new Set())
  const [misses, setMisses] = useState(0)
  const [shake, setShake] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isRecord, setIsRecord] = useState(false)

  function start() {
    const keuze = PAREN[Math.floor(Math.random() * PAREN.length)]
    setPaar(keuze)
    setFound(new Set())
    setMisses(0)
    setPhase('playing')
  }

  function tap(e: React.MouseEvent<HTMLDivElement>) {
    if (!paar || phase !== 'playing') return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100

    let hitIndex = -1
    paar.diffs.forEach((d, i) => {
      if (found.has(i)) return
      if (afstand(xPct, yPct, d.x, d.y) <= d.r) hitIndex = i
    })

    if (hitIndex >= 0) {
      playPop()
      const next = new Set(found)
      next.add(hitIndex)
      setFound(next)
      if (next.size >= paar.diffs.length) {
        const scoreBase = paar.diffs.length * 10 - misses * 2
        const score = Math.max(paar.diffs.length, scoreBase)
        setFinalScore(score)
        setIsRecord(submitScore(GAME_ID, profile, score))
        playStar()
        setPhase('done')
      }
    } else {
      playWrong()
      setMisses((m) => m + 1)
      setShake((n) => n + 1)
    }
  }

  function panel(letter: 'a' | 'b', key: string) {
    if (!paar) return null
    return (
      <div
        key={key}
        onClick={tap}
        style={{
          position: 'relative',
          width: 'min(90vw, 420px)',
          margin: '0 auto',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
          cursor: 'pointer',
          userSelect: 'none',
          lineHeight: 0,
        }}
      >
        <img src={fotoUrl(paar.id, letter)} alt="" draggable={false} style={{ width: '100%', display: 'block' }} />
        {paar.diffs.map((d, i) =>
          found.has(i) ? (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: `${d.r * 2}%`,
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: '3px solid var(--good)',
                background: 'rgba(255,255,255,0.15)',
                pointerEvents: 'none',
              }}
            />
          ) : null,
        )}
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader
        title="Foto Verschillen"
        onBack={onExit}
        right={
          phase === 'playing' && paar ? (
            <span className="star-count">
              🔍 {found.size}/{paar.diffs.length}
            </span>
          ) : undefined
        }
      />

      {phase === 'start' && (
        <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ fontSize: '4rem' }}>🖼️</span>
          <p style={{ textAlign: 'center', maxWidth: 320 }}>
            Twee echte foto's lijken op elkaar, maar niet helemaal! Tik de plekken aan die verschillen.
          </p>
          <BigButton variant="accent" style={{ minWidth: 220 }} onClick={start}>
            ▶️ Start
          </BigButton>
        </div>
      )}

      {phase === 'playing' && paar && (
        <div
          key={shake}
          className={shake > 0 ? 'shake' : ''}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {panel('a', 'a')}
          {panel('b', 'b')}
        </div>
      )}

      {phase === 'done' && (
        <div className="screen">
          <p style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}>🖼️🎉 Alles gevonden!</p>
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
