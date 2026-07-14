import { useEffect, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playPop, playWrong } from '../../../core/audio'
import { speak } from '../../../core/speech'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { BigButton } from '../../../ui/BigButton'

const MODULE_ID = 'kijkgoed'

const EMOJI_POOL = [
  '🍎', '🍌', '🍇', '🍓', '🐶', '🐱', '🐸', '🦆', '⭐', '🌸',
  '⚽', '🎈', '🚗', '🐟', '🦋', '🌳', '🍄', '⛵', '🎁', '🧸',
  '🦊', '🐼', '🐰', '🦁', '🐧', '🐳', '🦄', '🐢', '☀️', '🌙',
]

type Mode = 'verdwijnen' | 'wisselen' | 'mix'
type Phase = 'instellen' | 'onthouden' | 'verstopt' | 'zoeken' | 'klaar'

const MODES: { id: Mode; label: string }[] = [
  { id: 'verdwijnen', label: '🫥 Verdwijnen' },
  { id: 'wisselen', label: '🔀 Wisselen' },
  { id: 'mix', label: '🎲 Allebei' },
]

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
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
  mode: 'verdwijnen' | 'wisselen'
  before: string[] // wat het kind eerst ziet
  after: (string | null)[] // na de verandering (null = verdwenen)
  /** Posities die veranderd zijn (verdwenen of gewisseld). */
  changed: number[]
}

function buildObjects(count: number, allowDoubles: boolean): string[] {
  if (!allowDoubles) return shuffle(EMOJI_POOL).slice(0, count)
  // Kleinere pool zodat dubbels ook echt voorkomen
  const pool = shuffle(EMOJI_POOL).slice(0, Math.max(3, Math.ceil(count * 0.6)))
  for (;;) {
    const objects = Array.from({ length: count }, () => pool[randomInt(pool.length)])
    if (new Set(objects).size >= 2) return objects // wisselen moet mogelijk blijven
  }
}

function newRound(mode: Mode, count: number, changes: number, allowDoubles: boolean): Round {
  const roundMode: 'verdwijnen' | 'wisselen' =
    mode === 'mix' ? (Math.random() < 0.5 ? 'verdwijnen' : 'wisselen') : mode
  const before = buildObjects(count, allowDoubles)

  if (roundMode === 'verdwijnen') {
    const removed = shuffle(before.map((_, i) => i)).slice(0, Math.min(changes, count - 1))
    const after = before.map((emoji, i) => (removed.includes(i) ? null : emoji))
    return { mode: roundMode, before, after, changed: removed.sort((a, b) => a - b) }
  }

  // Wisselen: `changes` paren, elk paar met twéé verschillende figuurtjes —
  // twee dezelfde wisselen valt immers niet op.
  const pairCount = Math.min(changes, Math.floor(count / 2))
  for (let attempt = 0; attempt < 200; attempt++) {
    const free = shuffle(before.map((_, i) => i))
    const pairs: [number, number][] = []
    while (pairs.length < pairCount && free.length >= 2) {
      const a = free.shift()!
      const partner = free.findIndex((i) => before[i] !== before[a])
      if (partner === -1) break
      pairs.push([a, free.splice(partner, 1)[0]])
    }
    if (pairs.length < pairCount) continue
    const after: (string | null)[] = [...before]
    for (const [a, b] of pairs) {
      after[a] = before[b]
      after[b] = before[a]
    }
    const changed = pairs.flat().sort((x, y) => x - y)
    return { mode: 'wisselen', before, after, changed }
  }
  // Lukt het niet (bv. te veel dezelfde figuurtjes): val terug op verdwijnen
  return newRound('verdwijnen', count, changes, allowDoubles)
}

/** Antwoordopties voor een verdwenen figuurtje: het juiste + 3 afleiders. */
function optionsFor(correct: string): string[] {
  const options = new Set<string>([correct])
  while (options.size < 4) {
    options.add(EMOJI_POOL[randomInt(EMOJI_POOL.length)])
  }
  return shuffle([...options])
}

export function KijkGoedModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('instellen')
  const [mode, setMode] = useState<Mode>('verdwijnen')
  const [count, setCount] = useState(6)
  const [changes, setChanges] = useState(1)
  const [allowDoubles, setAllowDoubles] = useState(false)
  const [round, setRound] = useState<Round | null>(null)
  const [found, setFound] = useState<Set<number>>(new Set())
  const [gapIndex, setGapIndex] = useState(0) // actieve ❓ bij verdwijnen
  const [options, setOptions] = useState<string[]>([])
  const [misses, setMisses] = useState(0)
  const [shake, setShake] = useState(0)
  const [starTrigger, setStarTrigger] = useState(0)

  function start() {
    const r = newRound(mode, count, changes, allowDoubles)
    setRound(r)
    setFound(new Set())
    setGapIndex(0)
    setOptions(r.mode === 'verdwijnen' ? optionsFor(r.before[r.changed[0]]) : [])
    setMisses(0)
    setPhase('onthouden')
  }

  // Korte verstopfase tussen onthouden en zoeken
  useEffect(() => {
    if (phase !== 'verstopt') return
    const timer = setTimeout(() => setPhase('zoeken'), 900)
    return () => clearTimeout(timer)
  }, [phase])

  function finish(missCount: number) {
    recordAnswer(profile.id, MODULE_ID, missCount === 0)
    playCorrect()
    if (missCount === 0) setStarTrigger((n) => n + 1)
    setPhase('klaar')
  }

  function chooseOption(emoji: string) {
    if (!round || phase !== 'zoeken') return
    const gapPos = round.changed[gapIndex]
    if (emoji === round.before[gapPos]) {
      playPop()
      const nextFound = new Set(found).add(gapPos)
      setFound(nextFound)
      const nextGap = gapIndex + 1
      if (nextGap >= round.changed.length) {
        finish(misses)
      } else {
        setGapIndex(nextGap)
        setOptions(optionsFor(round.before[round.changed[nextGap]]))
      }
    } else {
      playWrong()
      setMisses((m) => m + 1)
      setShake((n) => n + 1)
    }
  }

  function tapObject(index: number) {
    if (!round || phase !== 'zoeken' || round.mode !== 'wisselen') return
    if (found.has(index)) return
    if (round.changed.includes(index)) {
      playPop()
      const nextFound = new Set(found).add(index)
      setFound(nextFound)
      if (nextFound.size >= round.changed.length) finish(misses)
    } else {
      playWrong()
      setMisses((m) => m + 1)
      setShake((n) => n + 1)
    }
  }

  function objectGrid(items: (string | null)[], interactive: boolean) {
    return (
      <div
        key={shake}
        className={shake > 0 ? 'shake' : ''}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 10,
          maxWidth: 420,
          margin: '12px auto',
        }}
      >
        {items.map((emoji, i) => {
          const isActiveGap =
            round?.mode === 'verdwijnen' && phase === 'zoeken' && round.changed[gapIndex] === i
          const isFound = found.has(i)
          return (
            <button
              key={i}
              onClick={() => interactive && tapObject(i)}
              aria-label={emoji ?? 'Leeg vakje'}
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                fontSize: '2.4rem',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isFound ? 'var(--good-soft)' : 'var(--surface)',
                boxShadow: 'var(--shadow)',
                outline: isActiveGap
                  ? '3px solid var(--accent)'
                  : isFound
                    ? '3px solid var(--good)'
                    : 'none',
                outlineOffset: -3,
              }}
            >
              {emoji ?? (isFound ? round?.before[i] : '❓')}
            </button>
          )
        })}
      </div>
    )
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader title="Kijk goed!" onBack={onExit} right={<StarCount profileId={profile.id} />} />

        <div className="form-field">
          <label>Wat gebeurt er?</label>
          <div className="picker-grid">
            {MODES.map((m) => (
              <BigButton
                key={m.id}
                variant={m.id === mode ? 'accent' : 'soft'}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Hoeveel figuurtjes?</label>
          <div className="picker-grid">
            {[4, 6, 8, 10].map((n) => (
              <BigButton
                key={n}
                variant={n === count ? 'accent' : 'soft'}
                onClick={() => setCount(n)}
              >
                {n}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>{mode === 'verdwijnen' ? 'Hoeveel verdwijnen er?' : mode === 'wisselen' ? 'Hoeveel paren wisselen er?' : 'Hoeveel verandert er?'}</label>
          <div className="picker-grid">
            {[1, 2, 3].map((n) => (
              <BigButton
                key={n}
                variant={n === changes ? 'accent' : 'soft'}
                onClick={() => setChanges(n)}
              >
                {n}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <button className="toggle-row" onClick={() => setAllowDoubles((v) => !v)}>
            <span>Figuurtjes mogen dubbel</span>
            <span className={`switch ${allowDoubles ? 'switch--on' : ''}`} />
          </button>
        </div>

        <BigButton variant="accent" onClick={start}>
          ▶️ Start
        </BigButton>
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader
        title="Kijk goed!"
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton variant="ghost" onClick={() => setPhase('instellen')} aria-label="Instellingen">
              ⚙️
            </BigButton>
          </div>
        }
      />

      {phase === 'onthouden' && round && (
        <>
          <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', margin: '8px 0' }}>
            👀 Kijk goed en onthoud!
          </p>
          {objectGrid(round.before, false)}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BigButton
              variant="accent"
              style={{ minWidth: 220 }}
              onClick={() => {
                speak('Oogjes dicht!')
                setPhase('verstopt')
              }}
            >
              ✔ Ik heb ze onthouden!
            </BigButton>
          </div>
        </>
      )}

      {phase === 'verstopt' && (
        <p style={{ textAlign: 'center', fontSize: '5rem', margin: '80px 0' }}>🙈</p>
      )}

      {(phase === 'zoeken' || phase === 'klaar') && round && (
        <>
          <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', margin: '8px 0' }}>
            {phase === 'klaar'
              ? misses === 0
                ? '🎉 Foutloos, super!'
                : '🎉 Gelukt!'
              : round.mode === 'verdwijnen'
                ? '🫥 Wat is er verdwenen?'
                : '🔀 Tik de figuurtjes die wisselden!'}
          </p>
          {objectGrid(round.after, round.mode === 'wisselen' && phase === 'zoeken')}

          {phase === 'zoeken' && round.mode === 'verdwijnen' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {options.map((emoji) => (
                <BigButton
                  key={emoji}
                  variant="soft"
                  style={{ fontSize: '2rem', minWidth: 72, minHeight: 72 }}
                  onClick={() => chooseOption(emoji)}
                >
                  {emoji}
                </BigButton>
              ))}
            </div>
          )}

          {phase === 'klaar' && (
            <div className="feedback-panel feedback-panel--good">
              <span className="feedback-panel__emoji">👀</span>
              <div>
                {misses === 0
                  ? 'Jij hebt echte adelaarsogen!'
                  : 'Goed gevonden! Volgende keer nog beter opletten.'}
              </div>
              <BigButton variant="accent" onClick={start}>
                Nog eens spelen
              </BigButton>
            </div>
          )}
        </>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
