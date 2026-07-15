import { useState } from 'react'
import type { Profile } from '../core/profiles'
import { verifyProfilePin } from '../core/profiles'
import { BackHeader } from '../ui/BackHeader'
import { BigButton } from '../ui/BigButton'

interface ProfilePinGateProps {
  profile: Profile
  onSuccess: () => void
  onCancel: () => void
}

export function ProfilePinGate({ profile, onSuccess, onCancel }: ProfilePinGateProps) {
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)

  function submit() {
    if (verifyProfilePin(profile, code)) {
      onSuccess()
    } else {
      setWrong(true)
    }
  }

  return (
    <div className="screen">
      <BackHeader title={`${profile.avatar} ${profile.name}`} onBack={onCancel} />
      <div className="form-field">
        <label htmlFor="pin-code">Pincode</label>
        <input
          id="pin-code"
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
          <div>Foute pincode, probeer opnieuw.</div>
        </div>
      )}
      <BigButton variant="accent" onClick={submit}>
        Bevestigen
      </BigButton>
    </div>
  )
}
