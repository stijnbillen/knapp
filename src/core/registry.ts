import type { ComponentType } from 'react'
import type { BlockId, ModuleAccess, Profile } from './profiles'
import { getModuleAccess } from './profiles'
import { TellenModule } from '../modules/oefenen/tellen/TellenModule'
import { OptellenModule } from '../modules/oefenen/optellen/OptellenModule'
import { KijkGoedModule } from '../modules/oefenen/kijkgoed/KijkGoedModule'
import { KleurenVolgordeModule } from '../modules/oefenen/kleurenvolgorde/KleurenVolgordeModule'
import { IcoonPatroonModule } from '../modules/oefenen/icoonpatroon/IcoonPatroonModule'
import { EierenDierenModule } from '../modules/oefenen/eierendieren/EierenDierenModule'
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
import { EngelsModule } from '../modules/oefenen/engels/EngelsModule'
import { SpaansModule } from '../modules/oefenen/spaans/SpaansModule'
import { WoordzoekerModule } from '../modules/oefenen/woordzoeker/WoordzoekerModule'
import { BubbelsModule } from '../modules/spelen/bubbels/BubbelsModule'
import { PongModule } from '../modules/spelen/pong/PongModule'
import { OthelloModule } from '../modules/spelen/othello/OthelloModule'
import { TetrisModule } from '../modules/spelen/tetris/TetrisModule'
import { GalaxiaModule } from '../modules/spelen/galaxia/GalaxiaModule'
import { VerschillenModule } from '../modules/spelen/verschillen/VerschillenModule'
import { FotoVerschillenModule } from '../modules/spelen/fotoverschillen/FotoVerschillenModule'
import { SudokuModule } from '../modules/spelen/sudoku/SudokuModule'
import { MemoryModule } from '../modules/spelen/memory/MemoryModule'
import { CodeKrakerModule } from '../modules/spelen/codekraker/CodeKrakerModule'
import { SchakenModule } from '../modules/spelen/schaken/SchakenModule'
import { DamspelModule } from '../modules/spelen/damspel/DamspelModule'
import { BubbleShooterModule } from '../modules/spelen/bubbleshooter/BubbleShooterModule'

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
    id: 'kleurenvolgorde',
    title: 'Kleuren in volgorde',
    icon: '🌈',
    kind: 'oefenen',
    block: '5',
    component: KleurenVolgordeModule,
  },
  {
    id: 'icoonpatroon',
    title: 'Icoontjes in een patroon',
    icon: '🧠',
    kind: 'oefenen',
    block: '5',
    component: IcoonPatroonModule,
  },
  {
    id: 'eierendieren',
    title: 'Legt dit dier een ei?',
    icon: '🥚',
    kind: 'oefenen',
    block: '5',
    component: EierenDierenModule,
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
  {
    id: 'engels',
    title: 'Eerste les Engels',
    icon: '🇬🇧',
    kind: 'oefenen',
    block: '9',
    component: EngelsModule,
  },
  {
    id: 'spaans',
    title: 'Eerste les Spaans',
    icon: '🇪🇸',
    kind: 'oefenen',
    block: '9',
    component: SpaansModule,
  },
  {
    id: 'woordzoeker',
    title: 'Woordzoeker',
    icon: '🔍',
    kind: 'oefenen',
    block: '9',
    component: WoordzoekerModule,
  },
  { id: 'bubbels', title: 'Bubbels', icon: '🫧', kind: 'spelen', component: BubbelsModule },
  { id: 'pong', title: 'Pong', icon: '🏓', kind: 'spelen', component: PongModule },
  { id: 'othello', title: 'Othello', icon: '⚫', kind: 'spelen', component: OthelloModule },
  { id: 'tetris', title: 'Tetris', icon: '🧱', kind: 'spelen', component: TetrisModule },
  { id: 'galaxia', title: 'Galaxia', icon: '🚀', kind: 'spelen', component: GalaxiaModule },
  {
    id: 'verschillen',
    title: 'Emoji Verschillen',
    icon: '🔍',
    kind: 'spelen',
    component: VerschillenModule,
  },
  {
    id: 'fotoverschillen',
    title: 'Foto Verschillen',
    icon: '🖼️',
    kind: 'spelen',
    component: FotoVerschillenModule,
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
  { id: 'damspel', title: 'Dammen', icon: '🔴', kind: 'spelen', component: DamspelModule },
  {
    id: 'bubbleshooter',
    title: 'Bubble Shooter',
    icon: '🎯',
    kind: 'spelen',
    component: BubbleShooterModule,
  },
]

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id)
}

export interface ModuleBuckets {
  gratis: ModuleDef[]
  verdienSterren: ModuleDef[]
  gebruikSterren: ModuleDef[]
}

/** Verdeelt alle modules die voor dit profiel ingeschakeld zijn over de 3 secties. */
export function modulesForProfile(profile: Profile): ModuleBuckets {
  const buckets: ModuleBuckets = { gratis: [], verdienSterren: [], gebruikSterren: [] }
  for (const mod of MODULES) {
    const access = getModuleAccess(profile, mod.id)
    if (!access.enabled) continue
    if (mod.kind === 'oefenen') {
      ;(access.earnsStars ? buckets.verdienSterren : buckets.gratis).push(mod)
    } else {
      ;(access.costStars && access.costStars > 0 ? buckets.gebruikSterren : buckets.gratis).push(mod)
    }
  }
  return buckets
}

export type ProfilePreset = 'lagereschool' | 'kleuterklas'

export const PROFILE_PRESETS: { id: ProfilePreset; label: string; icon: string }[] = [
  { id: 'kleuterklas', label: 'Kind kleuterklas', icon: '🧸' },
  { id: 'lagereschool', label: 'Kind lagere school', icon: '🎓' },
]

/**
 * Standaard module-toegang voor een nieuw profiel op basis van een preset:
 * - kleuterklas: enkel de kleuter-oefeningen (blok '5') verdienen sterren.
 * - lagereschool: de lagereschool-oefeningen (blok '9') verdienen sterren,
 *   kleuter-oefeningen blijven toegankelijk maar leveren geen sterren op.
 * In beide gevallen kosten alle spelletjes 10 sterren voor 1 minuut.
 */
export function defaultModuleAccess(preset: ProfilePreset): Record<string, ModuleAccess> {
  const access: Record<string, ModuleAccess> = {}
  for (const mod of MODULES) {
    if (mod.kind === 'oefenen') {
      if (preset === 'lagereschool') {
        if (mod.block === '9') access[mod.id] = { enabled: true, earnsStars: true }
        else if (mod.block === '5') access[mod.id] = { enabled: true, earnsStars: false }
      } else {
        if (mod.block === '5') access[mod.id] = { enabled: true, earnsStars: true }
      }
    } else {
      access[mod.id] = { enabled: true, costStars: 10, costMinutes: 1 }
    }
  }
  return access
}
