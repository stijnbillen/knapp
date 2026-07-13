import { store } from './storage'

export interface Settings {
  soundOn: boolean
}

const KEY = 'settings'
const DEFAULTS: Settings = { soundOn: true }

export function getSettings(): Settings {
  return { ...DEFAULTS, ...store.get<Partial<Settings>>(KEY, {}) }
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  store.set(KEY, next)
  return next
}
