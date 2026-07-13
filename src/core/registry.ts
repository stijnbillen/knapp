import type { ComponentType } from 'react'
import type { BlockId, Profile } from './profiles'
import { TellenModule } from '../modules/oefenen/tellen/TellenModule'
import { OptellenModule } from '../modules/oefenen/optellen/OptellenModule'
import { LettersModule } from '../modules/oefenen/letters/LettersModule'
import { DoolhofModule } from '../modules/oefenen/doolhof/DoolhofModule'
import { SpellingModule } from '../modules/oefenen/spelling/SpellingModule'
import { StaartdelingModule } from '../modules/oefenen/staartdeling/StaartdelingModule'
import { TafelsModule } from '../modules/oefenen/tafels/TafelsModule'
import { BubbelsModule } from '../modules/spelen/bubbels/BubbelsModule'
import { PongModule } from '../modules/spelen/pong/PongModule'
import { OthelloModule } from '../modules/spelen/othello/OthelloModule'
import { TetrisModule } from '../modules/spelen/tetris/TetrisModule'
import { GalaxiaModule } from '../modules/spelen/galaxia/GalaxiaModule'
import { VerschillenModule } from '../modules/spelen/verschillen/VerschillenModule'

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
    id: 'tellen',
    title: 'Tellen',
    icon: '🔢',
    kind: 'oefenen',
    block: '5',
    component: TellenModule,
  },
  {
    id: 'letters',
    title: 'Letters',
    icon: '🔤',
    kind: 'oefenen',
    block: '5',
    component: LettersModule,
  },
  {
    id: 'doolhof',
    title: 'Doolhof',
    icon: '🐰',
    kind: 'oefenen',
    block: '5',
    component: DoolhofModule,
  },
  {
    id: 'optellen',
    title: 'Optellen',
    icon: '➕',
    kind: 'oefenen',
    block: '5',
    component: OptellenModule,
  },
  {
    id: 'tafels',
    title: 'Tafels',
    icon: '✖️',
    kind: 'oefenen',
    block: '9',
    component: TafelsModule,
  },
  {
    id: 'spelling',
    title: 'Spelling',
    icon: '📝',
    kind: 'oefenen',
    block: '9',
    component: SpellingModule,
  },
  {
    id: 'staartdeling',
    title: 'Staartdelingen',
    icon: '➗',
    kind: 'oefenen',
    block: '9',
    component: StaartdelingModule,
  },
  { id: 'bubbels', title: 'Bubbels', icon: '🫧', kind: 'spelen', component: BubbelsModule },
  { id: 'pong', title: 'Pong', icon: '🏓', kind: 'spelen', component: PongModule },
  { id: 'othello', title: 'Othello', icon: '⚫', kind: 'spelen', component: OthelloModule },
  { id: 'tetris', title: 'Tetris', icon: '🧱', kind: 'spelen', component: TetrisModule },
  { id: 'galaxia', title: 'Galaxia', icon: '🚀', kind: 'spelen', component: GalaxiaModule },
  {
    id: 'verschillen',
    title: 'Verschillen',
    icon: '🔍',
    kind: 'spelen',
    component: VerschillenModule,
  },
]

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id)
}

/** Oefenmodules van één blok die zichtbaar zijn voor dit profiel. */
export function exercisesForBlock(profile: Profile, block: BlockId): ModuleDef[] {
  return MODULES.filter((m) => m.kind === 'oefenen' && m.block === block && profile.blocks.includes(block))
}

export function games(): ModuleDef[] {
  return MODULES.filter((m) => m.kind === 'spelen')
}
