import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import LANDEN from './landen.json'

const MODULE_ID = 'landen'

interface Land {
  iso: string
  landNl: string
  landFr: string
  hoofdstadNl: string
  hoofdstadFr: string
  continent: string
  buurBelgie: boolean
  lat: number
  lon: number
}

const LANDEN_LIJST = LANDEN as Land[]

type Regio = 'buur' | 'Europa' | 'Afrika' | 'Azië' | 'Noord-Amerika' | 'Zuid-Amerika' | 'Oceanië' | 'wereldwijd'
type Veld = 'land' | 'hoofdstad' | 'vlag'
type Vorm = 'vrij' | 'meerkeuze'

const REGIOS: { id: Regio; label: string }[] = [
  { id: 'buur', label: '🇧🇪 Buurlanden' },
  { id: 'Europa', label: '🌍 Europa' },
  { id: 'Afrika', label: '🌍 Afrika' },
  { id: 'Azië', label: '🌏 Azië' },
  { id: 'Noord-Amerika', label: '🌎 Noord-Amerika' },
  { id: 'Zuid-Amerika', label: '🌎 Zuid-Amerika' },
  { id: 'Oceanië', label: '🌏 Oceanië' },
  { id: 'wereldwijd', label: '🔀 Wereldwijd' },
]

const VELD_VOLGORDE: Veld[] = ['land', 'hoofdstad', 'vlag']

const VELDEN: { id: Veld; label: string }[] = [
  { id: 'land', label: '🏳️ Land' },
  { id: 'hoofdstad', label: '🏛️ Hoofdstad' },
  { id: 'vlag', label: '🚩 Vlag' },
]

function isoToFlag(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

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

function filterPool(regio: Regio): Land[] {
  if (regio === 'buur') return LANDEN_LIJST.filter((l) => l.buurBelgie)
  if (regio === 'wereldwijd') return LANDEN_LIJST
  return LANDEN_LIJST.filter((l) => l.continent === regio)
}

function mcOptionsFor(correct: Land, pool: Land[]): Land[] {
  const source = pool.length >= 4 ? pool : LANDEN_LIJST
  const options = new Set<Land>([correct])
  while (options.size < 4) {
    options.add(source[randomInt(source.length)])
  }
  return shuffle([...options])
}

export function LandenModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<'instellen' | 'vraag'>('instellen')
  const [regio, setRegio] = useState<Regio>('Europa')
  const [velden, setVelden] = useState<Veld[]>(['land'])
  const [vorm, setVorm] = useState<Vorm>('meerkeuze')
  const [land, setLand] = useState<Land>(() => randomItem(filterPool('Europa')))
  const [targetIndex, setTargetIndex] = useState(0)
  const [buffer, setBuffer] = useState('')
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  const targets = VELD_VOLGORDE.filter((v) => velden.includes(v))
  const clueFields = VELD_VOLGORDE.filter((v) => !velden.includes(v))
  const currentTarget: Veld = targets[targetIndex] ?? targets[0]
  const pool = filterPool(regio)

  function toggleVeld(id: Veld) {
    if (vorm === 'vrij' && id === 'vlag') return
    setVelden((current) => {
      if (current.includes(id)) {
        if (current.length <= 1) return current
        return current.filter((v) => v !== id)
      }
      if (current.length >= 2) return current
      return [...current, id]
    })
  }

  function kiesVorm(v: Vorm) {
    setVorm(v)
    if (v === 'vrij') {
      setVelden((current) => {
        const filtered = current.filter((x) => x !== 'vlag')
        return filtered.length ? filtered : ['land']
      })
    }
  }

  function start() {
    setLand(randomItem(filterPool(regio)))
    setTargetIndex(0)
    setBuffer('')
    setFeedback(null)
    setPhase('vraag')
  }

  function handleResult(isCorrect: boolean) {
    recordAnswer(profile, MODULE_ID, isCorrect)
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
      setFeedback('good')
    } else {
      playWrong()
      setFeedback('bad')
    }
  }

  function confirmVrij() {
    if (feedback || buffer.trim().length === 0) return
    const accepted = currentTarget === 'land' ? [land.landNl, land.landFr] : [land.hoofdstadNl, land.hoofdstadFr]
    handleResult(accepted.some((a) => normalize(a) === normalize(buffer)))
  }

  function kiesOptie(gekozen: Land) {
    if (feedback) return
    handleResult(gekozen.iso === land.iso)
  }

  function next() {
    if (targetIndex + 1 < targets.length) {
      setTargetIndex((i) => i + 1)
    } else {
      const nieuwePool = filterPool(regio)
      const keuze = nieuwePool.length > 1 ? nieuwePool.filter((l) => l.iso !== land.iso) : nieuwePool
      setLand(randomItem(keuze))
      setTargetIndex(0)
    }
    setBuffer('')
    setFeedback(null)
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader title="Landen" onBack={onExit} />

        <div className="form-field">
          <label>Welke regio?</label>
          <div className="picker-grid">
            {REGIOS.map((r) => (
              <BigButton key={r.id} variant={r.id === regio ? 'accent' : 'soft'} onClick={() => setRegio(r.id)}>
                {r.label}
              </BigButton>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Wat wil je invullen? (max 2, min 1 blijft aanwijzing)</label>
          <div className="picker-grid">
            {VELDEN.map((v) => {
              const disabled = vorm === 'vrij' && v.id === 'vlag'
              return (
                <BigButton
                  key={v.id}
                  variant={velden.includes(v.id) ? 'accent' : 'soft'}
                  onClick={() => toggleVeld(v.id)}
                  disabled={disabled}
                  style={disabled ? { opacity: 0.4 } : undefined}
                >
                  {v.label}
                </BigButton>
              )
            })}
          </div>
        </div>

        <div className="form-field">
          <label>Antwoordvorm</label>
          <div className="picker-grid">
            <BigButton variant={vorm === 'vrij' ? 'accent' : 'soft'} onClick={() => kiesVorm('vrij')}>
              🖊️ Vrij invullen
            </BigButton>
            <BigButton variant={vorm === 'meerkeuze' ? 'accent' : 'soft'} onClick={() => kiesVorm('meerkeuze')}>
              🔘 Meerkeuze
            </BigButton>
          </div>
        </div>

        <BigButton variant="accent" onClick={start}>
          ▶️ Start
        </BigButton>
      </div>
    )
  }

  const mcOptions = vorm === 'meerkeuze' ? mcOptionsFor(land, pool) : []

  const promptText: Record<Veld, string> = {
    land: 'Wat is het land?',
    hoofdstad: 'Wat is de hoofdstad?',
    vlag: 'Welke vlag hoort hierbij?',
  }

  const juisteAntwoordTekst =
    currentTarget === 'land'
      ? `${land.landNl} / ${land.landFr}`
      : currentTarget === 'hoofdstad'
        ? `${land.hoofdstadNl} / ${land.hoofdstadFr}`
        : isoToFlag(land.iso)

  return (
    <div className="screen">
      <BackHeader
        title="Landen"
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

      <div style={{ textAlign: 'center', margin: '4px 0 16px' }}>
        {clueFields.map((f) => (
          <div key={f} style={{ margin: '6px 0' }}>
            {f === 'vlag' && <span style={{ fontSize: '3rem' }}>{isoToFlag(land.iso)}</span>}
            {f === 'land' && (
              <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                {land.landNl} / {land.landFr}
              </span>
            )}
            {f === 'hoofdstad' && (
              <span style={{ fontSize: '1.1rem' }}>
                {land.hoofdstadNl} / {land.hoofdstadFr}
              </span>
            )}
          </div>
        ))}
      </div>

      {targets.length > 1 && (
        <p style={{ textAlign: 'center', opacity: 0.7, margin: '0 0 4px' }}>
          Vraag {targetIndex + 1} van {targets.length}
        </p>
      )}
      <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', margin: '0 0 16px' }}>
        {promptText[currentTarget]}
      </p>

      {!feedback && vorm === 'vrij' && (
        <div className="form-field" style={{ maxWidth: 320, margin: '0 auto' }}>
          <input
            type="text"
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmVrij()}
            placeholder="NL of FR"
            autoFocus
          />
          <BigButton variant="accent" onClick={confirmVrij} disabled={buffer.trim().length === 0}>
            ✔ Nakijken
          </BigButton>
        </div>
      )}

      {!feedback && vorm === 'meerkeuze' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {mcOptions.map((opt) =>
            currentTarget === 'vlag' ? (
              <BigButton
                key={opt.iso}
                variant="soft"
                style={{ fontSize: '2.2rem', minWidth: 120 }}
                onClick={() => kiesOptie(opt)}
              >
                {isoToFlag(opt.iso)}
              </BigButton>
            ) : (
              <BigButton key={opt.iso} variant="soft" style={{ minWidth: 260 }} onClick={() => kiesOptie(opt)}>
                {currentTarget === 'land' ? `${opt.landNl} / ${opt.landFr}` : `${opt.hoofdstadNl} / ${opt.hoofdstadFr}`}
              </BigButton>
            ),
          )}
        </div>
      )}

      {feedback === 'good' && (
        <FeedbackPanel type="good" message="Juist! 🎉" actionLabel="Volgende" onAction={next} />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message={`Nog niet juist. Het juiste antwoord was ${juisteAntwoordTekst}.`}
          actionLabel="Volgende"
          onAction={next}
        />
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
