import { useState } from 'react'
import type { Profile } from '../core/profiles'
import { accentColor, createProfile, deleteProfile, loadProfiles, updateProfile } from '../core/profiles'
import type { ProfilePreset } from '../core/registry'
import { PROFILE_PRESETS, defaultModuleAccess } from '../core/registry'
import { awardStar, getProgress } from '../core/progress'
import { setAdminCode } from '../core/admin'
import { BackHeader } from '../ui/BackHeader'
import { BigButton } from '../ui/BigButton'
import { ProfileEditor } from './ProfileEditor'
import { AdminModuleMatrix } from './AdminModuleMatrix'

interface AdminPanelProps {
  onExit: () => void
}

export function AdminPanel({ onExit }: AdminPanelProps) {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles)
  const [editing, setEditing] = useState<Profile | 'new' | null>(null)
  const [presetPicker, setPresetPicker] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<ProfilePreset | null>(null)
  const [matrixFor, setMatrixFor] = useState<Profile | null>(null)
  const [grantFor, setGrantFor] = useState<Profile | null>(null)
  const [grantAmount, setGrantAmount] = useState('10')
  const [newCode, setNewCode] = useState('')
  const [codeSaved, setCodeSaved] = useState(false)

  if (presetPicker) {
    return (
      <div className="screen">
        <BackHeader title="Nieuw profiel" onBack={() => setPresetPicker(false)} />
        <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Kies een startpunt voor dit profiel:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {PROFILE_PRESETS.map((preset) => (
            <BigButton
              key={preset.id}
              variant="accent"
              style={{ minWidth: 240 }}
              onClick={() => {
                setPendingPreset(preset.id)
                setPresetPicker(false)
                setEditing('new')
              }}
            >
              {preset.icon} {preset.label}
            </BigButton>
          ))}
          <BigButton
            variant="ghost"
            style={{ minWidth: 240 }}
            onClick={() => {
              setPendingPreset(null)
              setPresetPicker(false)
              setEditing('new')
            }}
          >
            Leeg (zelf instellen)
          </BigButton>
        </div>
      </div>
    )
  }

  if (matrixFor) {
    return (
      <AdminModuleMatrix
        profile={matrixFor}
        onBack={() => {
          setMatrixFor(null)
          setProfiles(loadProfiles())
        }}
        onProfileChanged={setMatrixFor}
      />
    )
  }

  if (editing) {
    const existing = editing === 'new' ? undefined : editing
    return (
      <ProfileEditor
        profile={existing}
        adminMode
        onSave={(data) => {
          if (existing) {
            updateProfile({ ...existing, ...data })
          } else {
            const created = createProfile(data)
            if (pendingPreset) {
              updateProfile({ ...created, moduleAccess: defaultModuleAccess(pendingPreset) })
            }
          }
          setPendingPreset(null)
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
        onCancel={() => {
          setPendingPreset(null)
          setEditing(null)
        }}
      />
    )
  }

  return (
    <div className="screen">
      <BackHeader title="Beheerder" onBack={onExit} />

      <section className="menu-section">
        <h2>Profielen</h2>
        <div className="card-grid">
          {profiles.map((profile) => (
            <div key={profile.id} style={{ position: 'relative' }}>
              <div
                className="card card--accent-border"
                style={{ '--card-accent': accentColor(profile) } as React.CSSProperties}
              >
                <span className="card__emoji">{profile.avatar}</span>
                <span className="card__label">{profile.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                  ⭐ {getProgress(profile.id).stars}
                </span>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <BigButton variant="soft" onClick={() => setEditing(profile)} aria-label="Basisgegevens">
                    ✏️
                  </BigButton>
                  <BigButton variant="soft" onClick={() => setMatrixFor(profile)} aria-label="Modules beheren">
                    🎛️
                  </BigButton>
                  <BigButton variant="soft" onClick={() => setGrantFor(profile)} aria-label="Sterren toekennen">
                    ⭐+
                  </BigButton>
                </div>
              </div>
            </div>
          ))}
          <button className="card" onClick={() => setPresetPicker(true)}>
            <span className="card__emoji">➕</span>
            <span className="card__label">Nieuw profiel</span>
          </button>
        </div>
      </section>

      {grantFor && (
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
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <p style={{ fontWeight: 700 }}>
              Sterren toekennen aan {grantFor.avatar} {grantFor.name}
            </p>
            <input
              type="number"
              min={1}
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              style={{ width: 100, textAlign: 'center', fontSize: '1.2rem' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <BigButton onClick={() => setGrantFor(null)}>Annuleren</BigButton>
              <BigButton
                variant="accent"
                onClick={() => {
                  const amount = Math.max(1, Number(grantAmount) || 1)
                  awardStar(grantFor.id, amount)
                  setGrantFor(null)
                }}
              >
                Geef ⭐
              </BigButton>
            </div>
          </div>
        </div>
      )}

      <section className="menu-section">
        <h2>Wachtwoord beheerder</h2>
        <div className="form-field">
          <label htmlFor="new-admin-code">Nieuwe code</label>
          <input
            id="new-admin-code"
            type="text"
            value={newCode}
            onChange={(e) => {
              setNewCode(e.target.value)
              setCodeSaved(false)
            }}
          />
        </div>
        <BigButton
          variant="accent"
          disabled={!newCode.trim()}
          onClick={() => {
            setAdminCode(newCode.trim())
            setNewCode('')
            setCodeSaved(true)
          }}
        >
          💾 Code bewaren
        </BigButton>
        {codeSaved && <p style={{ color: 'var(--text-soft)' }}>Nieuwe code opgeslagen.</p>}
      </section>
    </div>
  )
}
