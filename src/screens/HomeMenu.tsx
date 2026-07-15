import { useState } from 'react'
import type { Profile } from '../core/profiles'
import { getModuleAccess } from '../core/profiles'
import type { ModuleDef } from '../core/registry'
import { modulesForProfile } from '../core/registry'
import { spendStars } from '../core/progress'
import { startPlaytimeGrant } from '../core/playtime'
import { AvatarBadge } from '../ui/AvatarBadge'
import { StarCount, useStars } from '../ui/StarCount'
import { BigButton } from '../ui/BigButton'
import { ConfirmSpendDialog } from '../ui/ConfirmSpendDialog'

interface HomeMenuProps {
  profile: Profile
  onOpenModule: (moduleId: string) => void
  onSwitchProfile: () => void
  onOpenSettings: () => void
}

function ModuleCards({
  modules,
  onOpen,
  renderBadge,
}: {
  modules: ModuleDef[]
  onOpen: (id: string) => void
  renderBadge?: (mod: ModuleDef) => React.ReactNode
}) {
  return (
    <div className="card-grid">
      {modules.map((mod) => (
        <button key={mod.id} className="card" onClick={() => onOpen(mod.id)}>
          <span className="card__emoji">{mod.icon}</span>
          <span className="card__label">{mod.title}</span>
          {renderBadge?.(mod)}
        </button>
      ))}
    </div>
  )
}

export function HomeMenu({ profile, onOpenModule, onSwitchProfile, onOpenSettings }: HomeMenuProps) {
  const { gratis, verdienSterren, gebruikSterren } = modulesForProfile(profile)
  const balance = useStars(profile.id)
  const [pendingSpend, setPendingSpend] = useState<ModuleDef | null>(null)

  function openCostedModule(mod: ModuleDef) {
    setPendingSpend(mod)
  }

  function confirmSpend() {
    if (!pendingSpend) return
    const access = getModuleAccess(profile, pendingSpend.id)
    const cost = access.costStars ?? 0
    if (spendStars(profile.id, cost)) {
      startPlaytimeGrant({
        profileId: profile.id,
        moduleId: pendingSpend.id,
        minutes: access.costMinutes ?? 0,
        startedAt: Date.now(),
      })
      const moduleId = pendingSpend.id
      setPendingSpend(null)
      onOpenModule(moduleId)
    }
  }

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

      {gratis.length > 0 && (
        <section className="menu-section">
          <h2>🆓 Gratis</h2>
          <ModuleCards modules={gratis} onOpen={onOpenModule} />
        </section>
      )}

      {verdienSterren.length > 0 && (
        <section className="menu-section">
          <h2>⭐ Verdien sterren</h2>
          <ModuleCards modules={verdienSterren} onOpen={onOpenModule} />
        </section>
      )}

      {gebruikSterren.length > 0 && (
        <section className="menu-section">
          <h2>🎮 Gebruik sterren</h2>
          <ModuleCards
            modules={gebruikSterren}
            onOpen={(id) => {
              const mod = gebruikSterren.find((m) => m.id === id)
              if (mod) openCostedModule(mod)
            }}
            renderBadge={(mod) => {
              const access = getModuleAccess(profile, mod.id)
              return (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                  {access.costStars}⭐→{access.costMinutes}min
                </span>
              )
            }}
          />
        </section>
      )}

      {pendingSpend && (
        <ConfirmSpendDialog
          moduleTitle={pendingSpend.title}
          costStars={getModuleAccess(profile, pendingSpend.id).costStars ?? 0}
          costMinutes={getModuleAccess(profile, pendingSpend.id).costMinutes ?? 0}
          balance={balance}
          onConfirm={confirmSpend}
          onCancel={() => setPendingSpend(null)}
        />
      )}
    </div>
  )
}
