import type { Profile } from '../core/profiles'
import { ALL_BLOCKS } from '../core/profiles'
import type { ModuleDef } from '../core/registry'
import { exercisesForBlock, games } from '../core/registry'
import { AvatarBadge } from '../ui/AvatarBadge'
import { StarCount } from '../ui/StarCount'
import { BigButton } from '../ui/BigButton'

interface HomeMenuProps {
  profile: Profile
  onOpenModule: (moduleId: string) => void
  onSwitchProfile: () => void
  onOpenSettings: () => void
}

function ModuleCards({ modules, onOpen }: { modules: ModuleDef[]; onOpen: (id: string) => void }) {
  return (
    <div className="card-grid">
      {modules.map((mod) => (
        <button key={mod.id} className="card" onClick={() => onOpen(mod.id)}>
          <span className="card__emoji">{mod.icon}</span>
          <span className="card__label">{mod.title}</span>
        </button>
      ))}
    </div>
  )
}

export function HomeMenu({ profile, onOpenModule, onSwitchProfile, onOpenSettings }: HomeMenuProps) {
  const gameList = games()

  return (
    <div className="screen">
      <header className="back-header">
        <button
          onClick={onSwitchProfile}
          aria-label="Ander profiel kiezen"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <AvatarBadge profile={profile} />
          <span style={{ fontWeight: 700 }}>{profile.name}</span>
        </button>
        <span style={{ flex: 1 }} />
        <StarCount profileId={profile.id} />
        <BigButton variant="ghost" onClick={onOpenSettings} aria-label="Instellingen">
          ⚙️
        </BigButton>
      </header>

      {ALL_BLOCKS.map((block) => {
        const mods = exercisesForBlock(profile, block.id)
        if (mods.length === 0) return null
        return (
          <section className="menu-section" key={block.id}>
            <h2>✏️ Oefenen {block.label}</h2>
            <ModuleCards modules={mods} onOpen={onOpenModule} />
          </section>
        )
      })}

      {profile.games && (
        <section className="menu-section">
          <h2>🎮 Spelen</h2>
          <ModuleCards modules={gameList} onOpen={onOpenModule} />
        </section>
      )}
    </div>
  )
}
