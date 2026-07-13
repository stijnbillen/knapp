import type { ReactNode } from 'react'
import { BigButton } from './BigButton'

interface FeedbackPanelProps {
  type: 'good' | 'bad'
  message: ReactNode
  /** Tekst op de actieknop, bv. "Volgende" of "Probeer opnieuw". */
  actionLabel: string
  onAction: () => void
}

/**
 * Vriendelijke feedback na een antwoord. Een fout is nooit "straf":
 * korte uitleg en de kans om opnieuw te proberen.
 */
export function FeedbackPanel({ type, message, actionLabel, onAction }: FeedbackPanelProps) {
  return (
    <div className={`feedback-panel feedback-panel--${type}`}>
      <span className="feedback-panel__emoji">{type === 'good' ? '🎉' : '🤔'}</span>
      <div>{message}</div>
      <BigButton variant="accent" onClick={onAction} autoFocus>
        {actionLabel}
      </BigButton>
    </div>
  )
}
