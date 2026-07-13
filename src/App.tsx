import { useState } from 'react'
import type { Profile } from './core/profiles'
import { accentColor } from './core/profiles'
import { getModule } from './core/registry'
import { ProfileSelect } from './screens/ProfileSelect'
import { HomeMenu } from './screens/HomeMenu'
import { Settings } from './screens/Settings'

type View = { name: 'home' } | { name: 'settings' } | { name: 'module'; moduleId: string }

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<View>({ name: 'home' })

  if (!profile) {
    return (
      <ProfileSelect
        onSelect={(p) => {
          setProfile(p)
          setView({ name: 'home' })
        }}
      />
    )
  }

  const style = { '--accent': accentColor(profile) } as React.CSSProperties

  let content: React.ReactNode
  if (view.name === 'settings') {
    content = <Settings onBack={() => setView({ name: 'home' })} />
  } else if (view.name === 'module') {
    const mod = getModule(view.moduleId)
    if (mod) {
      const ModuleComponent = mod.component
      content = <ModuleComponent profile={profile} onExit={() => setView({ name: 'home' })} />
    } else {
      content = null
    }
  } else {
    content = (
      <HomeMenu
        profile={profile}
        onOpenModule={(moduleId) => setView({ name: 'module', moduleId })}
        onSwitchProfile={() => setProfile(null)}
        onOpenSettings={() => setView({ name: 'settings' })}
      />
    )
  }

  return (
    <div style={{ ...style, display: 'flex', flexDirection: 'column', flex: 1 }}>{content}</div>
  )
}
