import { store } from './storage'
import type { Profile } from './profiles'
import { getModuleAccess } from './profiles'

export interface ModuleProgress {
  attempted: number
  correct: number
  level: number
  streak: number // aantal juiste antwoorden op rij (voor niveauopbouw)
}

export interface ProfileProgress {
  stars: number
  modules: Record<string, ModuleProgress>
}

const emptyModule: ModuleProgress = { attempted: 0, correct: 0, level: 1, streak: 0 }

function key(profileId: string): string {
  return `progress:${profileId}`
}

// Eenvoudig subscribe-mechanisme zodat de UI (sterrenteller) live meebeweegt.
const listeners = new Set<() => void>()

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(): void {
  listeners.forEach((l) => l())
}

export function getProgress(profileId: string): ProfileProgress {
  return store.get<ProfileProgress>(key(profileId), { stars: 0, modules: {} })
}

export function getModuleProgress(profileId: string, moduleId: string): ModuleProgress {
  return getProgress(profileId).modules[moduleId] ?? { ...emptyModule }
}

export function awardStar(profileId: string, amount = 1): void {
  const progress = getProgress(profileId)
  progress.stars += amount
  store.set(key(profileId), progress)
  emit()
}

/** Trekt sterren af; geeft false (geen wijziging) bij onvoldoende saldo. */
export function spendStars(profileId: string, amount: number): boolean {
  const progress = getProgress(profileId)
  if (progress.stars < amount) return false
  progress.stars -= amount
  store.set(key(profileId), progress)
  emit()
  return true
}

export interface AnswerOptions {
  maxLevel?: number // hoogste niveau van de module
  streakToLevelUp?: number // aantal juiste op rij om een niveau te stijgen
}

/**
 * Registreert een antwoord: telt mee in de statistiek, kent een ster toe bij
 * juist (enkel als de beheerder dit voor dit profiel/deze module heeft
 * ingesteld), en verhoogt het niveau na een reeks juiste antwoorden. Een fout
 * antwoord verlaagt het niveau nooit — enkel de reeks begint opnieuw.
 */
export function recordAnswer(
  profile: Profile,
  moduleId: string,
  isCorrect: boolean,
  options: AnswerOptions = {},
): ModuleProgress {
  const { maxLevel = 1, streakToLevelUp = 5 } = options
  const earnsStar = getModuleAccess(profile, moduleId).earnsStars === true
  const progress = getProgress(profile.id)
  const mod = progress.modules[moduleId] ?? { ...emptyModule }

  mod.attempted += 1
  if (isCorrect) {
    mod.correct += 1
    mod.streak += 1
    if (earnsStar) progress.stars += 1
    if (mod.streak >= streakToLevelUp && mod.level < maxLevel) {
      mod.level += 1
      mod.streak = 0
    }
  } else {
    mod.streak = 0
  }

  progress.modules[moduleId] = mod
  store.set(key(profile.id), progress)
  emit()
  return mod
}
