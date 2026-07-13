import { useState } from 'react'
import type { ModuleProps } from '../../../core/registry'
import { recordAnswer } from '../../../core/progress'
import { playCorrect, playWrong } from '../../../core/audio'
import { BackHeader } from '../../../ui/BackHeader'
import { StarCount } from '../../../ui/StarCount'
import { StarBurst } from '../../../ui/StarBurst'
import { FeedbackPanel } from '../../../ui/FeedbackPanel'

// Tijdelijke dummy-oefening om de volledige flow te testen:
// vraag → antwoord → ster/feedback → volgende. Verdwijnt in fase 2.

const EMOJI_POOL = ['🐟', '🎈', '🍎', '🌳', '🐞', '🚗', '🌙', '🧸']

function newRound(): string[] {
  const others = [...EMOJI_POOL].sort(() => Math.random() - 0.5).slice(0, 3)
  return [...others, '⭐'].sort(() => Math.random() - 0.5)
}

export function DummyModule({ profile, onExit }: ModuleProps) {
  const [items, setItems] = useState(newRound)
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [starTrigger, setStarTrigger] = useState(0)

  function choose(emoji: string) {
    if (feedback) return
    const isCorrect = emoji === '⭐'
    recordAnswer(profile.id, 'dummy', isCorrect)
    if (isCorrect) {
      playCorrect()
      setStarTrigger((n) => n + 1)
      setFeedback('good')
    } else {
      playWrong()
      setFeedback('bad')
    }
  }

  function next() {
    if (feedback === 'good') setItems(newRound())
    setFeedback(null)
  }

  return (
    <div className="screen">
      <BackHeader
        title="Tik de ster"
        onBack={onExit}
        right={<StarCount profileId={profile.id} />}
      />
      <p style={{ textAlign: 'center', fontSize: '1.3rem' }}>Tik de ster aan! ⭐</p>
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {items.map((emoji, i) => (
          <button key={i} className="card" onClick={() => choose(emoji)}>
            <span className="card__emoji">{emoji}</span>
          </button>
        ))}
      </div>
      {feedback === 'good' && (
        <FeedbackPanel type="good" message="Goed zo!" actionLabel="Volgende" onAction={next} />
      )}
      {feedback === 'bad' && (
        <FeedbackPanel
          type="bad"
          message="Dat was niet de ster. Probeer nog eens!"
          actionLabel="Opnieuw"
          onAction={next}
        />
      )}
      <StarBurst trigger={starTrigger} />
    </div>
  )
}
