import { useState } from 'react'
import type { Profile } from '../core/profiles'
import { AVATARS, COLOR_PALETTE } from '../core/profiles'
import { BigButton } from '../ui/BigButton'
import { BackHeader } from '../ui/BackHeader'

interface ProfileEditorProps {
  /** Bestaand profiel bewerken, of undefined voor een nieuw profiel. */
  profile?: Profile
  /** Beheerdersmodus: toont ook pincode-veld en verwijderknop. */
  adminMode?: boolean
  onSave: (data: { name: string; avatar: string; color: string; pinCode?: string }) => void
  onDelete?: () => void
  onCancel: () => void
}

export function ProfileEditor({ profile, adminMode, onSave, onDelete, onCancel }: ProfileEditorProps) {
  const [name, setName] = useState(profile?.name ?? '')
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0])
  const [color, setColor] = useState(profile?.color ?? 'blauw')
  const [pinCode, setPinCode] = useState(profile?.pinCode ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({
      name: trimmed,
      avatar,
      color,
      ...(adminMode ? { pinCode: pinCode.trim() || undefined } : {}),
    })
  }

  return (
    <div className="screen">
      <BackHeader title={profile ? 'Profiel bewerken' : 'Nieuw profiel'} onBack={onCancel} />

      <div className="form-field">
        <label htmlFor="profile-name">Naam</label>
        <input
          id="profile-name"
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bv. Lotte"
        />
      </div>

      <div className="form-field">
        <label>Kies een figuurtje</label>
        <div className="picker-grid">
          {AVATARS.map((a) => (
            <button
              key={a}
              className={`picker-option ${a === avatar ? 'picker-option--selected' : ''}`}
              onClick={() => setAvatar(a)}
              aria-label={`Figuurtje ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label>Kies een kleur</label>
        <div className="picker-grid">
          {Object.entries(COLOR_PALETTE).map(([key, value]) => (
            <button
              key={key}
              className={`picker-option ${key === color ? 'picker-option--selected' : ''}`}
              style={{ background: value }}
              onClick={() => setColor(key)}
              aria-label={`Kleur ${key}`}
            />
          ))}
        </div>
      </div>

      {adminMode && (
        <div className="form-field">
          <label htmlFor="profile-pin">Pincode (optioneel)</label>
          <input
            id="profile-pin"
            type="text"
            value={pinCode}
            maxLength={12}
            onChange={(e) => setPinCode(e.target.value)}
            placeholder="Leeg = instant instappen"
          />
        </div>
      )}

      <BigButton variant="accent" onClick={save} disabled={!name.trim()}>
        💾 Bewaren
      </BigButton>

      {adminMode &&
        onDelete &&
        (confirmDelete ? (
          <div className="feedback-panel feedback-panel--bad">
            <div>
              Profiel <strong>{profile?.name}</strong> en alle voortgang verwijderen?
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <BigButton onClick={() => setConfirmDelete(false)}>Nee, houden</BigButton>
              <BigButton variant="accent" onClick={onDelete}>
                Ja, verwijderen
              </BigButton>
            </div>
          </div>
        ) : (
          <BigButton
            variant="ghost"
            style={{ marginTop: 12 }}
            onClick={() => setConfirmDelete(true)}
          >
            🗑️ Profiel verwijderen
          </BigButton>
        ))}
    </div>
  )
}
