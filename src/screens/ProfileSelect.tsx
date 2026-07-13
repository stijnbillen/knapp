import { useState } from 'react'
import type { Profile } from '../core/profiles'
import {
  accentColor,
  createProfile,
  deleteProfile,
  loadProfiles,
  updateProfile,
} from '../core/profiles'
import { ProfileEditor } from './ProfileEditor'

interface ProfileSelectProps {
  onSelect: (profile: Profile) => void
}

export function ProfileSelect({ onSelect }: ProfileSelectProps) {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles)
  const [editing, setEditing] = useState<Profile | 'new' | null>(null)

  if (editing) {
    const existing = editing === 'new' ? undefined : editing
    return (
      <ProfileEditor
        profile={existing}
        onSave={(data) => {
          if (existing) updateProfile({ ...data, id: existing.id })
          else createProfile(data)
          setProfiles(loadProfiles())
          setEditing(null)
        }}
        onDelete={
          existing
            ? () => {
                deleteProfile(existing.id)
                setProfiles(loadProfiles())
                setEditing(null)
              }
            : undefined
        }
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Wie speelt er? 👋</h1>
      <div className="card-grid">
        {profiles.map((profile) => (
          <div key={profile.id} style={{ position: 'relative' }}>
            <button
              className="card card--accent-border"
              style={{ '--card-accent': accentColor(profile), width: '100%' } as React.CSSProperties}
              onClick={() => onSelect(profile)}
            >
              <span className="card__emoji">{profile.avatar}</span>
              <span className="card__label">{profile.name}</span>
            </button>
            <button
              onClick={() => setEditing(profile)}
              aria-label={`Profiel ${profile.name} bewerken`}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 'var(--tap)',
                minHeight: 'var(--tap)',
                fontSize: '1.1rem',
                opacity: 0.6,
              }}
            >
              ✏️
            </button>
          </div>
        ))}
        <button className="card" onClick={() => setEditing('new')}>
          <span className="card__emoji">➕</span>
          <span className="card__label">Nieuw profiel</span>
        </button>
      </div>
    </div>
  )
}
