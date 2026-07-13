import { store } from './storage'
import type { Profile } from './profiles'

// Per spel één gedeelde topscorelijst over alle profielen heen,
// zodat het hele gezin tegen elkaar kan strijden.

export interface HighscoreEntry {
  profileId: string
  name: string
  avatar: string
  score: number
  date: string // ISO
}

const MAX_ENTRIES = 10

function key(gameId: string): string {
  return `scores:${gameId}`
}

export function getHighscores(gameId: string): HighscoreEntry[] {
  return store.get<HighscoreEntry[]>(key(gameId), [])
}

/** Beste score van één profiel voor dit spel. */
export function getPersonalBest(gameId: string, profileId: string): number {
  const scores = getHighscores(gameId)
  return scores
    .filter((e) => e.profileId === profileId)
    .reduce((best, e) => Math.max(best, e.score), 0)
}

/**
 * Voegt een score toe. Per profiel blijft alleen de beste score in de lijst
 * staan; de lijst is gesorteerd en beperkt tot de top 10.
 * Geeft terug of dit een nieuw persoonlijk record is.
 */
export function submitScore(gameId: string, profile: Profile, score: number): boolean {
  if (score <= 0) return false
  const scores = getHighscores(gameId)
  const previousBest = getPersonalBest(gameId, profile.id)
  const isRecord = score > previousBest

  const others = scores.filter((e) => e.profileId !== profile.id)
  const ownBest: HighscoreEntry = {
    profileId: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    score: Math.max(score, previousBest),
    date: new Date().toISOString(),
  }
  const next = [...others, ownBest].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES)
  store.set(key(gameId), next)
  return isRecord
}
