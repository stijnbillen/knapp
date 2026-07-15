import type { Profile } from '../core/profiles'
import { ALL_BLOCKS, getModuleAccess, setModuleAccess, updateProfile } from '../core/profiles'
import type { ModuleDef } from '../core/registry'
import { MODULES } from '../core/registry'
import { BackHeader } from '../ui/BackHeader'

interface AdminModuleMatrixProps {
  profile: Profile
  onBack: () => void
  onProfileChanged: (profile: Profile) => void
}

function ModuleRow({
  mod,
  profile,
  onChange,
}: {
  mod: ModuleDef
  profile: Profile
  onChange: (profile: Profile) => void
}) {
  const access = getModuleAccess(profile, mod.id)

  function patch(next: Partial<typeof access>) {
    onChange(setModuleAccess(profile, mod.id, { ...access, ...next }))
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
      <button className="toggle-row" onClick={() => patch({ enabled: !access.enabled })}>
        <span>
          {mod.icon} {mod.title}
        </span>
        <span className={`switch ${access.enabled ? 'switch--on' : ''}`} />
      </button>

      {access.enabled && mod.kind === 'oefenen' && (
        <button
          className="toggle-row"
          style={{ paddingLeft: 20 }}
          onClick={() => patch({ earnsStars: !access.earnsStars })}
        >
          <span>⭐ Verdient sterren</span>
          <span className={`switch ${access.earnsStars ? 'switch--on' : ''}`} />
        </button>
      )}

      {access.enabled && mod.kind === 'spelen' && (
        <>
          <button
            className="toggle-row"
            style={{ paddingLeft: 20 }}
            onClick={() =>
              patch(
                access.costStars
                  ? { costStars: undefined, costMinutes: undefined }
                  : { costStars: 10, costMinutes: 15 },
              )
            }
          >
            <span>⭐ Kost sterren</span>
            <span className={`switch ${access.costStars ? 'switch--on' : ''}`} />
          </button>
          {!!access.costStars && (
            <div style={{ display: 'flex', gap: 12, paddingLeft: 20, marginTop: 6 }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                Sterren
                <input
                  type="number"
                  min={1}
                  value={access.costStars}
                  onChange={(e) => patch({ costStars: Math.max(1, Number(e.target.value) || 1) })}
                  style={{ width: 70 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                Minuten
                <input
                  type="number"
                  min={1}
                  value={access.costMinutes ?? 15}
                  onChange={(e) => patch({ costMinutes: Math.max(1, Number(e.target.value) || 1) })}
                  style={{ width: 70 }}
                />
              </label>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function AdminModuleMatrix({ profile, onBack, onProfileChanged }: AdminModuleMatrixProps) {
  function handleChange(next: Profile) {
    updateProfile(next)
    onProfileChanged(next)
  }

  const oefenenPerBlok = ALL_BLOCKS.map((block) => ({
    block,
    modules: MODULES.filter((m) => m.kind === 'oefenen' && m.block === block.id),
  }))
  const spelen = MODULES.filter((m) => m.kind === 'spelen')

  return (
    <div className="screen">
      <BackHeader title={`Modules voor ${profile.name}`} onBack={onBack} />

      {oefenenPerBlok.map(({ block, modules }) => (
        <section className="menu-section" key={block.id}>
          <h2>✏️ Oefenen {block.label}</h2>
          {modules.map((mod) => (
            <ModuleRow key={mod.id} mod={mod} profile={profile} onChange={handleChange} />
          ))}
        </section>
      ))}

      <section className="menu-section">
        <h2>🎮 Spelen</h2>
        {spelen.map((mod) => (
          <ModuleRow key={mod.id} mod={mod} profile={profile} onChange={handleChange} />
        ))}
      </section>
    </div>
  )
}
