import { useState } from 'react'
import type { Profile } from '../core/profiles'
import { updateProfile } from '../core/profiles'
import { getSettings, updateSettings } from '../core/settings'
import { BackHeader } from '../ui/BackHeader'
import { BigButton } from '../ui/BigButton'
import { playCorrect } from '../core/audio'
import { ProfileEditor } from './ProfileEditor'

interface SettingsProps {
  profile: Profile
  onBack: () => void
  onProfileUpdated: (profile: Profile) => void
}

export function Settings({ profile, onBack, onProfileUpdated }: SettingsProps) {
  const [settings, setSettings] = useState(getSettings)
  const [editingSelf, setEditingSelf] = useState(false)

  function toggleSound() {
    const next = updateSettings({ soundOn: !settings.soundOn })
    setSettings(next)
    if (next.soundOn) playCorrect()
  }

  if (editingSelf) {
    return (
      <ProfileEditor
        profile={profile}
        onSave={(data) => {
          const updated = { ...profile, ...data }
          updateProfile(updated)
          onProfileUpdated(updated)
          setEditingSelf(false)
        }}
        onCancel={() => setEditingSelf(false)}
      />
    )
  }

  return (
    <div className="screen">
      <BackHeader title="Instellingen" onBack={onBack} />
      <button className="toggle-row" onClick={toggleSound}>
        <span>🔔 Geluidjes</span>
        <span className={`switch ${settings.soundOn ? 'switch--on' : ''}`} />
      </button>
      <BigButton variant="soft" style={{ marginTop: 12 }} onClick={() => setEditingSelf(true)}>
        ✏️ Mijn profiel aanpassen
      </BigButton>
      <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>
        💡 Tip: open deze app in Chrome op je tablet of gsm en kies “Toevoegen aan startscherm”.
        Daarna werkt ze ook zonder internet.
      </p>
    </div>
  )
}
