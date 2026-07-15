import { useState } from 'react'
import { verifyAdminCode } from '../core/admin'
import { BackHeader } from '../ui/BackHeader'
import { BigButton } from '../ui/BigButton'

interface AdminGateProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AdminGate({ onSuccess, onCancel }: AdminGateProps) {
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)

  function submit() {
    if (verifyAdminCode(code)) {
      onSuccess()
    } else {
      setWrong(true)
    }
  }

  return (
    <div className="screen">
      <BackHeader title="Beheerder" onBack={onCancel} />
      <div className="form-field">
        <label htmlFor="admin-code">Code</label>
        <input
          id="admin-code"
          type="password"
          value={code}
          autoFocus
          onChange={(e) => {
            setCode(e.target.value)
            setWrong(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      {wrong && (
        <div className="feedback-panel feedback-panel--bad">
          <div>Foute code, probeer opnieuw.</div>
        </div>
      )}
      <BigButton variant="accent" onClick={submit}>
        Bevestigen
      </BigButton>
    </div>
  )
}
