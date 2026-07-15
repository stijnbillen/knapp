import { store, newId } from './storage'

// Niveaublokken: enkel nog metadata voor groepering in het beheerpaneel,
// niet langer gebruikt om profieltoegang te bepalen (zie moduleAccess).
export type BlockId = '5' | '9'

export const ALL_BLOCKS: { id: BlockId; label: string }[] = [
  { id: '5', label: '5 jaar' },
  { id: '9', label: '9 jaar' },
]

export interface ModuleAccess {
  enabled: boolean
  /** Enkel relevant voor kind:'oefenen': levert een juist antwoord een ster op? */
  earnsStars?: boolean
  /** Enkel relevant voor kind:'spelen': kost dit spel sterren om te spelen? */
  costStars?: number
  /** Aantal minuten speeltijd gekocht per costStars-beurt. */
  costMinutes?: number
}

export interface Profile {
  id: string
  name: string
  avatar: string // emoji
  color: string // sleutel uit COLOR_PALETTE
  /** Optionele eenvoudige toegangscode; leeg = instant instappen. */
  pinCode?: string
  /** Per module (ModuleDef.id) ingesteld door de beheerder. */
  moduleAccess: Record<string, ModuleAccess>
}

export const AVATARS = [
  '🦊', '🐼', '🦄', '🐸', '🐙', '🦖',
  '🐱', '🐶', '🦋', '🐢', '🐰', '🦁',
  '🐧', '🐳', '🚀', '🌸', '⭐', '🍀',
]

export const COLOR_PALETTE: Record<string, string> = {
  koraal: '#e85d5d',
  oranje: '#e8862e',
  groen: '#3d9e50',
  turkoois: '#1f9e9e',
  blauw: '#3b7fd6',
  paars: '#8a5cd6',
  roze: '#d65ca8',
}

const KEY = 'profiles:v2'

export function loadProfiles(): Profile[] {
  const existing = store.get<Profile[]>(KEY, [])
  return existing.map((p) => ({ ...p, moduleAccess: p.moduleAccess ?? {} }))
}

export function saveProfiles(profiles: Profile[]): void {
  store.set(KEY, profiles)
}

export function createProfile(data: Omit<Profile, 'id' | 'moduleAccess'>): Profile {
  const profile: Profile = { ...data, id: newId(), moduleAccess: {} }
  saveProfiles([...loadProfiles(), profile])
  return profile
}

export function updateProfile(profile: Profile): void {
  saveProfiles(loadProfiles().map((p) => (p.id === profile.id ? profile : p)))
}

export function deleteProfile(id: string): void {
  saveProfiles(loadProfiles().filter((p) => p.id !== id))
  store.remove(`progress:${id}`)
}

export function accentColor(profile: Profile): string {
  return COLOR_PALETTE[profile.color] ?? COLOR_PALETTE.blauw
}

export function getModuleAccess(profile: Profile, moduleId: string): ModuleAccess {
  return profile.moduleAccess[moduleId] ?? { enabled: false }
}

export function setModuleAccess(profile: Profile, moduleId: string, access: ModuleAccess): Profile {
  return { ...profile, moduleAccess: { ...profile.moduleAccess, [moduleId]: access } }
}

export function verifyProfilePin(profile: Profile, input: string): boolean {
  return !profile.pinCode || input === profile.pinCode
}
