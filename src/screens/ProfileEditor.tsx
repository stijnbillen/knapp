import { useState } from 'react'
import type { BlockId, Profile } from '../core/profiles'
import { ALL_BLOCKS, AVATARS, COLOR_PALETTE } from '../core/profiles'
import { BigButton } from '../ui/BigButton'
import { BackHeader } from '../ui/BackHeader'

interface ProfileEditorProps {
  /** Bestaand profiel bewerken, of undefined voor een nieuw profiel. */
  profile?: Profile
  onSave: (data: Omit<Profile, 'id'>) => void
  onDelete?: () => void
  onCancel: () => void
}

export function ProfileEditor({ profile, onSave, onDelete, onCancel }: ProfileEditorProps) {
  const [name, setName] = useState(profile?.name ?? '')
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0])
  const [color, setColor] = useState(profile?.color ?? 'blauw')
  const [blocks, setBlocks] = useState<BlockId[]>(profile?.blocks ?? [])
  const [isAdult, setIsAdult] = useState(profile?.isAdult ?? false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleBlock(id: BlockId) {
    setBlocks((current) =>
      current.includes(id) ? current.filter((b) => b !== id) : [...current, id],
    )
  }

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ name: trimmed, avatar, color, blocks, isAdult })
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

      <div className="form-field">
        <label>Oefenblokken</label>
        {ALL_BLOCKS.map((block) => (
          <button key={block.id} className="toggle-row" onClick={() => toggleBlock(block.id)}>
            <span>Oefeningen {block.label}</span>
            <span className={`switch ${blocks.includes(block.id) ? 'switch--on' : ''}`} />
          </button>
        ))}
        <button className="toggle-row" onClick={() => setIsAdult((v) => !v)}>
          <span>Volwassen profiel</span>
          <span className={`switch ${isAdult ? 'switch--on' : ''}`} />
        </button>
      </div>

      <BigButton variant="accent" onClick={save} disabled={!name.trim()}>
        💾 Bewaren
      </BigButton>

      {onDelete &&
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
