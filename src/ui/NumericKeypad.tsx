import { BigButton } from './BigButton'

interface NumericKeypadProps {
  buffer: string
  onDigit: (d: string) => void
  onBackspace: () => void
  onConfirm: () => void
}

/** Cijfertoetsenbord (0-9, wissen, bevestigen) voor numerieke antwoorden. */
export function NumericKeypad({ buffer, onDigit, onBackspace, onConfirm }: NumericKeypadProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 72px)',
        gap: 8,
        justifyContent: 'center',
        marginTop: 8,
      }}
    >
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <BigButton key={d} variant="soft" style={{ fontSize: '1.5rem' }} onClick={() => onDigit(d)}>
          {d}
        </BigButton>
      ))}
      <BigButton variant="ghost" style={{ fontSize: '1.3rem' }} onClick={onBackspace} aria-label="Wissen">
        ⌫
      </BigButton>
      <BigButton variant="soft" style={{ fontSize: '1.5rem' }} onClick={() => onDigit('0')}>
        0
      </BigButton>
      <BigButton
        variant="accent"
        style={{ fontSize: '1.3rem' }}
        onClick={onConfirm}
        disabled={buffer.length === 0}
        aria-label="Bevestigen"
      >
        ✔
      </BigButton>
    </div>
  )
}
