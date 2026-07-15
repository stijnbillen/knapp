import { useState } from 'react'
import type { Profile } from '../core/profiles'
import { accentColor, loadProfiles } from '../core/profiles'
import { AdminGate } from './AdminGate'
import { AdminPanel } from './AdminPanel'
import { ProfilePinGate } from './ProfilePinGate'

interface ProfileSelectProps {
  onSelect: (profile: Profile) => void
}

type Stage = { name: 'grid' } | { name: 'admin-gate' } | { name: 'admin-panel' } | { name: 'pin'; profile: Profile }

export function ProfileSelect({ onSelect }: ProfileSelectProps) {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles)
  const [stage, setStage] = useState<Stage>({ name: 'grid' })

  if (stage.name === 'admin-gate') {
    return (
      <AdminGate onSuccess={() => setStage({ name: 'admin-panel' })} onCancel={() => setStage({ name: 'grid' })} />
    )
  }

  if (stage.name === 'admin-panel') {
    return (
      <AdminPanel
        onExit={() => {
          setProfiles(loadProfiles())
          setStage({ name: 'grid' })
        }}
      />
    )
  }

  if (stage.name === 'pin') {
    const { profile } = stage
    return (
      <ProfilePinGate
        profile={profile}
        onSuccess={() => onSelect(profile)}
        onCancel={() => setStage({ name: 'grid' })}
      />
    )
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Wie speelt er? 👋</h1>
      {profiles.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>
          Nog geen profielen — vraag een volwassene om er een te maken via Beheerder.
        </p>
      )}
      <div className="card-grid">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            className="card card--accent-border"
            style={{ '--card-accent': accentColor(profile), width: '100%' } as React.CSSProperties}
            onClick={() =>
              profile.pinCode ? setStage({ name: 'pin', profile }) : onSelect(profile)
            }
          >
            <span className="card__emoji">{profile.avatar}</span>
            <span className="card__label">{profile.name}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setStage({ name: 'admin-gate' })}
        style={{
          marginTop: 24,
          alignSelf: 'center',
          opacity: 0.6,
          fontSize: '0.9rem',
        }}
      >
        ⚙️ Beheerder
      </button>
    </div>
  )
}
