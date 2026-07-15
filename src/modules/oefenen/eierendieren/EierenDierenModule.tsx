import { useEffect, useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { speak } from '../../../core/speech'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'
import { BigButton } from '../../../ui/BigButton'
import { ReadAloudButton } from '../../../ui/ReadAloudButton'
import DIEREN_JSON from './dieren.json'
import SPECIALE_JSON from './specialeDieren.json'

const MODULE_ID = 'eierendieren'

interface Dier {
  id: string
  emoji: string
  legtEi: boolean
  nl: string
  fr: string
  babyEmoji: string
  babyNl: string
  babyFr: string
  draagtijd: string
  aantalJongen: string
  frequentie: string
  leeftijd: string
}

interface SpeciaalDier {
  id: string
  emoji: string
  nl: string
  fr: string
  uitleg: string
  draagtijd: string
  aantalJongen: string
  frequentie: string
  leeftijd: string
}

function weetjesPanel(d: { draagtijd: string; aantalJongen: string; frequentie: string; leeftijd: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 16,
        boxShadow: 'var(--shadow)',
        padding: '14px 16px',
        maxWidth: 420,
        margin: '12px auto 0',
      }}
    >
      <p style={{ fontWeight: 700, margin: '0 0 8px' }}>🤓 Wist je dat...</p>
      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-soft)' }}>
        <li>{d.draagtijd}</li>
        <li>{d.aantalJongen}</li>
        <li>{d.frequentie}</li>
        <li>{d.leeftijd}</li>
      </ul>
    </div>
  )
}

const dieren = DIEREN_JSON as Dier[]
const specialeDieren = SPECIALE_JSON as SpeciaalDier[]

type Phase = 'start' | 'spelen' | 'speciaal'

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function newDier(prevId: string | null): Dier {
  const keuze = dieren.length > 1 ? dieren.filter((d) => d.id !== prevId) : dieren
  return randomItem(keuze)
}

function taalkaart(emoji: string, nl: string, fr: string) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 16,
        boxShadow: 'var(--shadow)',
        padding: 14,
        textAlign: 'center',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: '3rem' }}>{emoji}</div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span style={{ fontWeight: 700 }}>{nl}</span>
        <ReadAloudButton text={nl} lang="nl" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--text-soft)', fontSize: '0.95rem' }}>{fr}</span>
        <ReadAloudButton text={fr} lang="fr" />
      </div>
    </div>
  )
}

export function EierenDierenModule({ profile, onExit }: ModuleProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [dier, setDier] = useState<Dier>(() => newDier(null))
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  // Bij elk nieuw dier meteen de Nederlandse naam voorlezen.
  useEffect(() => {
    if (phase === 'spelen' && !feedback) speak(dier.nl, 'nl')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dier, phase])

  function start() {
    setDier(newDier(null))
    setFeedback(null)
    setPhase('spelen')
  }

  function kies(legtEi: boolean) {
    if (feedback) return
    const isCorrect = legtEi === dier.legtEi
    recordAnswer(profile.id, MODULE_ID, isCorrect)
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
    } else {
      playWrong()
    }
    setFeedback(isCorrect ? 'good' : 'bad')
  }

  function volgende() {
    setDier(newDier(dier.id))
    setFeedback(null)
  }

  if (phase === 'start') {
    return (
      <div className="screen">
        <BackHeader title="Legt dit dier een ei?" onBack={onExit} right={<StarCount profileId={profile.id} />} />
        <p style={{ textAlign: 'center', fontSize: '4rem', margin: '16px 0' }}>🥚🐣</p>
        <p style={{ textAlign: 'center', margin: '0 0 20px' }}>
          Legt dit dier een ei, of krijgt het een baby in de buik?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <BigButton variant="accent" style={{ minWidth: 220 }} onClick={start}>
            ▶️ Start
          </BigButton>
          <BigButton variant="ghost" onClick={() => setPhase('speciaal')}>
            ✨ Speciale dieren
          </BigButton>
        </div>
      </div>
    )
  }

  if (phase === 'speciaal') {
    return (
      <div className="screen">
        <BackHeader title="Speciale dieren" onBack={() => setPhase('start')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {specialeDieren.map((d) => (
            <div
              key={d.id}
              style={{
                background: 'var(--surface)',
                borderRadius: 16,
                boxShadow: 'var(--shadow)',
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '3.5rem' }}>{d.emoji}</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{d.nl}</span>
                <ReadAloudButton text={d.nl} lang="nl" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ color: 'var(--text-soft)' }}>{d.fr}</span>
                <ReadAloudButton text={d.fr} lang="fr" />
              </div>
              <p style={{ marginTop: 10 }}>{d.uitleg}</p>
              {weetjesPanel(d)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader
        title="Legt dit dier een ei?"
        onBack={onExit}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarCount profileId={profile.id} />
            <BigButton variant="ghost" onClick={() => setPhase('start')} aria-label="Stoppen">
              ⏹️
            </BigButton>
          </div>
        }
      />

      <div style={{ textAlign: 'center', fontSize: '6rem', margin: '8px 0' }}>{dier.emoji}</div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>{dier.nl}</span>
        <ReadAloudButton text={dier.nl} lang="nl" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--text-soft)', fontSize: '1.05rem' }}>{dier.fr}</span>
        <ReadAloudButton text={dier.fr} lang="fr" />
      </div>

      {!feedback && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <BigButton
            style={{ minWidth: 260, minHeight: 64, fontSize: '1.15rem', background: '#f9a825', color: '#fff' }}
            onClick={() => kies(true)}
          >
            🥚 Legt een ei
          </BigButton>
          <BigButton
            style={{ minWidth: 260, minHeight: 64, fontSize: '1.15rem', background: '#ec407a', color: '#fff' }}
            onClick={() => kies(false)}
          >
            🤰 Krijgt een baby in de buik
          </BigButton>
        </div>
      )}

      {feedback && (
        <>
          <FeedbackPanel
            type={feedback}
            message={
              feedback === 'good' ? (
                <span>Juist! 🎉</span>
              ) : (
                <span>
                  Niet helemaal — {dier.nl} {dier.legtEi ? 'legt een ei' : 'krijgt een baby in de buik'}.
                </span>
              )
            }
            actionLabel="Volgende dier"
            onAction={volgende}
          />

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            {dier.legtEi
              ? taalkaart('🥚', 'het ei', "l'œuf")
              : taalkaart('🤰', 'in de buik', 'dans le ventre')}
            {taalkaart(dier.babyEmoji, dier.babyNl, dier.babyFr)}
          </div>

          {weetjesPanel(dier)}
        </>
      )}

      <StarBurst trigger={starTrigger} />
    </div>
  )
}
