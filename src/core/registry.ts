import type { ComponentType } from 'react'
import type { BlockId, Profile } from './profiles'
import { TellenModule } from '../modules/oefenen/tellen/TellenModule'
import { OptellenModule } from '../modules/oefenen/optellen/OptellenModule'
import { KijkGoedModule } from '../modules/oefenen/kijkgoed/KijkGoedModule'
import { PlaatjesSudokuModule } from '../modules/oefenen/plaatjessudoku/PlaatjesSudokuModule'
import { LettersModule } from '../modules/oefenen/letters/LettersModule'
import { DoolhofModule } from '../modules/oefenen/doolhof/DoolhofModule'
import { SpellingModule } from '../modules/oefenen/spelling/SpellingModule'
import { StaartdelingModule } from '../modules/oefenen/staartdeling/StaartdelingModule'
import { TafelsModule } from '../modules/oefenen/tafels/TafelsModule'
import { KlokModule } from '../modules/oefenen/klok/KlokModule'
import { DicteeModule } from '../modules/oefenen/dictee/DicteeModule'
import { AftrekkenModule } from '../modules/oefenen/aftrekken/AftrekkenModule'
import { BegrijpendLezenModule } from '../modules/oefenen/begrijpendlezen/BegrijpendLezenModule'
import { MetenWegenModule } from '../modules/oefenen/metenwegen/MetenWegenModule'
import { GetallenlijnModule } from '../modules/oefenen/getallenlijn/GetallenlijnModule'
import { LandenModule } from '../modules/oefenen/landen/LandenModule'
import { BubbelsModule } from '../modules/spelen/bubbels/BubbelsModule'
import { PongModule } from '../modules/spelen/pong/PongModule'
import { OthelloModule } from '../modules/spelen/othello/OthelloModule'
import { TetrisModule } from '../modules/spelen/tetris/TetrisModule'
import { GalaxiaModule } from '../modules/spelen/galaxia/GalaxiaModule'
import { VerschillenModule } from '../modules/spelen/verschillen/VerschillenModule'
import { SudokuModule } from '../modules/spelen/sudoku/SudokuModule'
import { MemoryModule } from '../modules/spelen/memory/MemoryModule'
import { CodeKrakerModule } from '../modules/spelen/codekraker/CodeKrakerModule'
import { SchakenModule } from '../modules/spelen/schaken/SchakenModule'

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
    id: 'kijkgoed',
    title: 'Kijk goed!',
    icon: '👀',
    kind: 'oefenen',
    block: '5',
    component: KijkGoedModule,
  },
  {
    id: 'plaatjessudoku',
    title: 'Sudoku',
    icon: '🐸',
    kind: 'oefenen',
    block: '5',
    component: PlaatjesSudokuModule,
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
  {
    id: 'klok',
    title: 'Klok',
    icon: '🕒',
    kind: 'oefenen',
    block: '9',
    component: KlokModule,
  },
  {
    id: 'dictee',
    title: 'Dictee',
    icon: '🎧',
    kind: 'oefenen',
    block: '9',
    component: DicteeModule,
  },
  {
    id: 'aftrekken',
    title: 'Aftrekken',
    icon: '➖',
    kind: 'oefenen',
    block: '9',
    component: AftrekkenModule,
  },
  {
    id: 'begrijpendlezen',
    title: 'Begrijpend lezen',
    icon: '📖',
    kind: 'oefenen',
    block: '9',
    component: BegrijpendLezenModule,
  },
  {
    id: 'metenwegen',
    title: 'Meten & Wegen',
    icon: '📏',
    kind: 'oefenen',
    block: '9',
    component: MetenWegenModule,
  },
  {
    id: 'getallenlijn',
    title: 'Getallenlijn',
    icon: '🔢',
    kind: 'oefenen',
    block: '9',
    component: GetallenlijnModule,
  },
  {
    id: 'landen',
    title: 'Landen',
    icon: '🌍',
    kind: 'oefenen',
    block: '9',
    component: LandenModule,
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
  { id: 'sudoku', title: 'Sudoku', icon: '🧩', kind: 'spelen', component: SudokuModule },
  { id: 'memory', title: 'Memory', icon: '🎴', kind: 'spelen', component: MemoryModule },
  {
    id: 'codekraker',
    title: 'Code Kraker',
    icon: '🕵️',
    kind: 'spelen',
    component: CodeKrakerModule,
  },
  { id: 'schaken', title: 'Schaken', icon: '♟️', kind: 'spelen', component: SchakenModule },
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
