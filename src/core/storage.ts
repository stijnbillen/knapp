// Kleine opslagabstractie zodat localStorage later vervangbaar is
// (bv. door IndexedDB of een backend) zonder de rest van de app te wijzigen.

const PREFIX = 'knapp:'

export interface AppStorage {
  get<T>(key: string, fallback: T): T
  set<T>(key: string, value: T): void
  remove(key: string): void
}

function createLocalStorage(): AppStorage {
  return {
    get<T>(key: string, fallback: T): T {
      try {
        const raw = localStorage.getItem(PREFIX + key)
        if (raw === null) return fallback
        return JSON.parse(raw) as T
      } catch {
        return fallback
      }
    },
    set<T>(key: string, value: T): void {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value))
      } catch {
        // opslag vol of niet beschikbaar: stil negeren, app blijft werken
      }
    },
    remove(key: string): void {
      try {
        localStorage.removeItem(PREFIX + key)
      } catch {
        // negeren
      }
    },
  }
}

export const store: AppStorage = createLocalStorage()

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
