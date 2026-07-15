import { store } from './storage'

export interface AdminConfig {
  code: string
}

const KEY = 'admin'
const DEFAULT_CODE = '0000'

export function getAdminConfig(): AdminConfig {
  return store.get<AdminConfig>(KEY, { code: DEFAULT_CODE })
}

export function verifyAdminCode(input: string): boolean {
  return input === getAdminConfig().code
}

export function setAdminCode(newCode: string): void {
  store.set(KEY, { code: newCode })
}
