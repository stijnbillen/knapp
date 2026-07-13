import type { ReactNode } from 'react'
import { BigButton } from './BigButton'

interface BackHeaderProps {
  title: string
  onBack: () => void
  /** Rechts in de kop, bv. een sterrenteller. */
  right?: ReactNode
}

export function BackHeader({ title, onBack, right }: BackHeaderProps) {
  return (
    <header className="back-header">
      <BigButton variant="soft" onClick={onBack} aria-label="Terug">
        ←
      </BigButton>
      <span className="back-header__title">{title}</span>
      {right ?? <span style={{ width: 'var(--tap)' }} />}
    </header>
  )
}
