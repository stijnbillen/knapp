import type { ComponentType } from 'react'
import type { BlockId, Profile } from './profiles'
import { DummyModule } from '../modules/oefenen/dummy/DummyModule'

// Centraal register van alle oefenmodules en spelletjes.
// Nieuwe module toevoegen = component schrijven + hier registreren.

export interface ModuleProps {
  profile: Profile
  onExit: () => void
}

export interface ModuleDef {
  id: string
  title: string
  icon: string
  kind: 'oefenen' | 'spelen'
  /** Alleen voor oefenmodules: bij welk niveaublok hoort deze module. */
  block?: BlockId
  component: ComponentType<ModuleProps>
}

export const MODULES: ModuleDef[] = [
  {
    id: 'dummy',
    title: 'Tik de ster',
    icon: '⭐',
    kind: 'oefenen',
    block: '5',
    component: DummyModule,
  },
]

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id)
}

/** Oefenmodules die zichtbaar zijn voor dit profiel (op basis van blokken). */
export function exercisesFor(profile: Profile): ModuleDef[] {
  return MODULES.filter((m) => m.kind === 'oefenen' && m.block && profile.blocks.includes(m.block))
}

export function games(): ModuleDef[] {
  return MODULES.filter((m) => m.kind === 'spelen')
}
