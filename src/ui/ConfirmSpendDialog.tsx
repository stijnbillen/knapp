import { BigButton } from './BigButton'

interface ConfirmSpendDialogProps {
  moduleTitle: string
  costStars: number
  costMinutes: number
  balance: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSpendDialog({
  moduleTitle,
  costStars,
  costMinutes,
  balance,
  onConfirm,
  onCancel,
}: ConfirmSpendDialogProps) {
  const genoeg = balance >= costStars

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: 'var(--shadow)',
          padding: 24,
          maxWidth: 320,
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 700, marginTop: 0 }}>{moduleTitle}</p>
        <p>
          Dit spel kost <strong>{costStars} ⭐</strong> voor <strong>{costMinutes} minuten</strong> spelen.
          Doorgaan?
        </p>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>Je hebt {balance} ⭐.</p>
        {!genoeg && (
          <div className="feedback-panel feedback-panel--bad">
            <div>Niet genoeg sterren ⭐</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
          <BigButton onClick={onCancel}>Annuleren</BigButton>
          <BigButton variant="accent" onClick={onConfirm} disabled={!genoeg}>
            Speel!
          </BigButton>
        </div>
      </div>
    </div>
  )
}
