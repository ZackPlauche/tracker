import type { AppData } from './types'

const STORAGE_KEY = 'tracker-app-v2'

export function emptyData(): AppData {
  return {
    funnels: [],
    events: [],
    activeFunnelId: null,
    updatedAt: Date.now(),
  }
}

export function loadData(): AppData {
  try {
    // Drop legacy seeded localStorage
    localStorage.removeItem('tracker-app-v1')
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const blank = emptyData()
      saveData(blank)
      return blank
    }
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.funnels || !Array.isArray(parsed.funnels)) {
      const blank = emptyData()
      saveData(blank)
      return blank
    }
    return {
      funnels: parsed.funnels,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      activeFunnelId: parsed.activeFunnelId ?? null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    }
  } catch {
    const blank = emptyData()
    saveData(blank)
    return blank
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearLocalData(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('tracker-app-v1')
}
