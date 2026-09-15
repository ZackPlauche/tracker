import type { AppData } from './types'
import { createSeedData } from './seed'

const STORAGE_KEY = 'tracker-app-v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = createSeedData()
      saveData(seed)
      return seed
    }
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.funnels || !Array.isArray(parsed.funnels)) {
      const seed = createSeedData()
      saveData(seed)
      return seed
    }
    return parsed
  } catch {
    const seed = createSeedData()
    saveData(seed)
    return seed
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
