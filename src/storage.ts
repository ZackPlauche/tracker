import type { AppData, Folder } from './types'

const STORAGE_KEY = 'tracker-app-v2'

export function sanitizeFolders(raw: unknown): Folder[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const folders: Folder[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const f = item as Folder
    if (typeof f.id !== 'string' || typeof f.name !== 'string') continue
    folders.push({
      id: f.id,
      name: f.name,
      ...(typeof f.order === 'number' ? { order: f.order } : {}),
    })
  }
  return folders.length ? folders : undefined
}


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
    const folders = sanitizeFolders(parsed.folders)
    return {
      funnels: parsed.funnels,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      activeFunnelId: parsed.activeFunnelId ?? null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      ...(typeof parsed.accentColor === 'string' && parsed.accentColor
        ? { accentColor: parsed.accentColor }
        : {}),
      ...(folders ? { folders } : {}),
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
