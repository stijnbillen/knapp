import { store, newId } from './storage'

// Niveaublokken: oefenmodules horen bij een blok, profielen kiezen welke
// blokken zichtbaar zijn. Later uitbreidbaar met bv. '6' of '10'.
export type BlockId = '5' | '9'

export const ALL_BLOCKS: { id: BlockId; label: string }[] = [
  { id: '5', label: '5 jaar' },
  { id: '9', label: '9 jaar' },
]

export interface Profile {
  id: string
  name: string
  avatar: string // emoji
  color: string // sleutel uit COLOR_PALETTE
  blocks: BlockId[]
  /** Sectie "Spelen" tonen voor dit profiel. */
  games: boolean
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

const KEY = 'profiles'

function seedProfiles(): Profile[] {
  return [
    { id: newId(), name: 'Kind 5', avatar: '🐸', color: 'groen', blocks: ['5'], games: true },
    { id: newId(), name: 'Kind 9', avatar: '🦊', color: 'oranje', blocks: ['9'], games: true },
    { id: newId(), name: 'Mama', avatar: '🌸', color: 'roze', blocks: [], games: true },
    { id: newId(), name: 'Papa', avatar: '🐼', color: 'blauw', blocks: [], games: true },
  ]
}

export function loadProfiles(): Profile[] {
  const existing = store.get<Profile[] | null>(KEY, null)
  if (existing && existing.length > 0) {
    // Migratie: oudere profielen hadden `isAdult` in plaats van `games`
    return existing.map((p) => ({ ...p, games: p.games ?? true }))
  }
  const seeded = seedProfiles()
  store.set(KEY, seeded)
  return seeded
}

export function saveProfiles(profiles: Profile[]): void {
  store.set(KEY, profiles)
}

export function createProfile(data: Omit<Profile, 'id'>): Profile {
  const profile: Profile = { ...data, id: newId() }
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
