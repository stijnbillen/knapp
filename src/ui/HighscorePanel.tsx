import type { Profile } from '../core/profiles'
import { getHighscores, getPersonalBest } from '../core/highscores'
import { BigButton } from './BigButton'

interface HighscorePanelProps {
  gameId: string
  profile: Profile
  /** Zojuist behaalde score (om te tonen), of undefined op een startscherm. */
  score?: number
  isRecord?: boolean
  actionLabel: string
  onAction: () => void
}

/** Einde-spel-paneel: eigen score + gedeelde topscorelijst van het gezin. */
export function HighscorePanel({
  gameId,
  profile,
  score,
  isRecord,
  actionLabel,
  onAction,
}: HighscorePanelProps) {
  const scores = getHighscores(gameId)
  const personalBest = getPersonalBest(gameId, profile.id)

  return (
    <div className="feedback-panel feedback-panel--good" style={{ maxWidth: 420, margin: '16px auto' }}>
      {score !== undefined && (
        <>
          <span className="feedback-panel__emoji">{isRecord ? '🏆' : '🎯'}</span>
          <div style={{ fontSize: '1.3rem' }}>
            {isRecord ? 'Nieuw record! ' : 'Jouw score: '}
            <strong>{score}</strong>
          </div>
          {!isRecord && personalBest > 0 && (
            <div style={{ color: 'var(--text-soft)' }}>Jouw beste: {personalBest}</div>
          )}
        </>
      )}

      {scores.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {scores.map((entry, i) => (
              <tr
                key={entry.profileId}
                style={{
                  fontWeight: entry.profileId === profile.id ? 700 : 400,
                  background: entry.profileId === profile.id ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{i + 1}.</td>
                <td style={{ padding: '4px 4px' }}>{entry.avatar}</td>
                <td style={{ padding: '4px 8px', textAlign: 'left' }}>{entry.name}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <BigButton variant="accent" onClick={onAction}>
        {actionLabel}
      </BigButton>
    </div>
  )
}
