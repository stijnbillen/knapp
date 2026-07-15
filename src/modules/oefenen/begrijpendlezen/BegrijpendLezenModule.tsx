import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { ReadAloudButton } from '../../../ui/ReadAloudButton'
import TEKSTEN from './teksten.json'

const MODULE_ID = 'begrijpendlezen'

type Niveau = 'makkelijk' | 'moeilijk'
type Phase = 'instellen' | 'lezen' | 'vraag' | 'klaar'

interface Vraag {
  vraag: string
  opties: string[]
  antwoord: number
}

interface Leestekst {
  id: string
  niveau: Niveau
  titel: string
  tekst: string
  vragen: Vraag[]
}

const TEKSTEN_LIJST = TEKSTEN as Leestekst[]

const NIVEAUS: { id: Niveau; label: string }[] = [
  { id: 'makkelijk', label: '📗 Makkelijk' },
  { id: 'moeilijk', label: '📕 Moeilijker' },
]

function kiesTekst(niveau: Niveau, vorigeId: string | null): Leestekst {
  const kandidaten = TEKSTEN_LIJST.filter((t) => t.niveau === niveau)
  const keuze = kandidaten.length > 1 ? kandidaten.filter((t) => t.id !== vorigeId) : kandidaten
  return keuze[Math.floor(Math.random() * keuze.length)]
}

export function BegrijpendLezenModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('instellen')
  const [niveau, setNiveau] = useState<Niveau>('makkelijk')
  const [tekst, setTekst] = useState<Leestekst | null>(null)
  const [vraagIndex, setVraagIndex] = useState(0)
  const [fouten, setFouten] = useState(0)
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function start() {
    setTekst(kiesTekst(niveau, tekst?.id ?? null))
    setVraagIndex(0)
    setFouten(0)
    setFeedback(null)
    setPhase('lezen')
  }

  function beginVragen() {
    setPhase('vraag')
  }

  function kiesOptie(index: number) {
    if (feedback || !tekst) return
    const juist = index === tekst.vragen[vraagIndex].antwoord
    recordAnswer(profile, MODULE_ID, juist)
    if (juist) {
      playCorrect()
      setStarTrigger((n) => n + 1)
      setFeedback('good')
    } else {
      playWrong()
      setFouten((f) => f + 1)
      setFeedback('bad')
    }
  }

  function volgende() {
    if (!tekst) return
    if (feedback === 'good') {
      const volgendeIndex = vraagIndex + 1
      if (volgendeIndex >= tekst.vragen.length) {
        setPhase('klaar')
        setFeedback(null)
        return
      }
      setVraagIndex(volgendeIndex)
    }
    setFeedback(null)
  }

  if (phase === 'instellen') {
    return (
      <div className="screen">
        <BackHeader title="Begrijpend lezen" onBack={onExit} />

        <div className="form-field">
          <label>Welk niveau?</label>
          <div className="picker-grid">
            {NIVEAUS.map((n) => (
              <BigButton
                key={n.id}
                variant={n.id === niveau ? 'accent' : 'soft'}
                onClick={() => setNiveau(n.id)}
              >
                {n.label}
              </BigButton>
            ))}
          </div>
        </div>

        <BigButton variant="accent" onClick={start}>
          ▶️ Start
        </BigButton>
      </div>
    )
  }

  if (!tekst) return null

  if (phase === 'lezen') {
    return (
      <div className="screen">
        <BackHeader
          title="Begrijpend lezen"
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

        <div className="feedback-panel" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <h2 style={{ margin: 0, flex: 1 }}>{tekst.titel}</h2>
            <ReadAloudButton text={tekst.tekst} />
          </div>
          <p style={{ lineHeight: 1.6, marginTop: 8 }}>{tekst.tekst}</p>
        </div>

        <BigButton variant="accent" onClick={beginVragen}>
          ❓ Begin de vragen
        </BigButton>
      </div>
    )
  }

  const vraag = tekst.vragen[vraagIndex]

  return (
    <div className="screen">
      <BackHeader
        title="Begrijpend lezen"
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

      {phase === 'vraag' && (
        <>
          <p style={{ textAlign: 'center', opacity: 0.7, margin: '4px 0' }}>
            Vraag {vraagIndex + 1} van {tekst.vragen.length}
          </p>
          <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.2rem', margin: '8px 0 16px' }}>
            {vraag.vraag}
          </p>

          {!feedback && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              {vraag.opties.map((optie, i) => (
                <BigButton key={optie} variant="soft" style={{ minWidth: 260 }} onClick={() => kiesOptie(i)}>
                  {optie}
                </BigButton>
              ))}
            </div>
          )}

          {feedback === 'good' && (
            <FeedbackPanel type="good" message="Juist! 🎉" actionLabel="Verder" onAction={volgende} />
          )}
          {feedback === 'bad' && (
            <FeedbackPanel
              type="bad"
              message="Nog niet helemaal. Denk nog eens aan het verhaal."
              actionLabel="Probeer opnieuw"
              onAction={volgende}
            />
          )}
        </>
      )}

      {phase === 'klaar' && (
        <div className="feedback-panel feedback-panel--good">
          <span className="feedback-panel__emoji">📖🎉</span>
          <div>
            {fouten === 0
              ? 'Alle vragen in één keer juist, knap gedaan!'
              : 'Je hebt alle vragen over dit verhaal beantwoord!'}
          </div>
          <BigButton variant="accent" onClick={start}>
            Nieuwe tekst
          </BigButton>
        </div>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
