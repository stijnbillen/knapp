import { useState } from 'react'
import { getSettings, updateSettings } from '../core/settings'
import { BackHeader } from '../ui/BackHeader'
import { playCorrect } from '../core/audio'

export function Settings({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState(getSettings)

  function toggleSound() {
    const next = updateSettings({ soundOn: !settings.soundOn })
    setSettings(next)
    if (next.soundOn) playCorrect()
  }

  return (
    <div className="screen">
      <BackHeader title="Instellingen" onBack={onBack} />
      <button className="toggle-row" onClick={toggleSound}>
        <span>🔔 Geluidjes</span>
        <span className={`switch ${settings.soundOn ? 'switch--on' : ''}`} />
      </button>
      <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>
        Profielen kan je bewerken op het scherm “Wie speelt er?” via het potloodje.
      </p>
    </div>
  )
}
