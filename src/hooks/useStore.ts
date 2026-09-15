import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { v4 as uuid } from 'uuid'
import { db } from '../lib/firebase'
import { clearLocalData, emptyData, loadData, saveData } from '../storage'
import type { AppData, CloudAppData, Event, Funnel, Metric } from '../types'
import { sortedMetrics, todayCount } from '../utils'

const WRITE_DEBOUNCE_MS = 300

function stamp(data: AppData): AppData {
  return { ...data, updatedAt: Date.now() }
}

function toCloud(data: AppData): CloudAppData {
  const payload: CloudAppData = {
    funnels: data.funnels,
    events: data.events,
    activeFunnelId: data.activeFunnelId,
    updatedAt: data.updatedAt ?? Date.now(),
  }
  // Firestore rejects undefined; JSON round-trip strips it
  return JSON.parse(JSON.stringify(payload)) as CloudAppData
}

function fromCloud(raw: CloudAppData): AppData {
  return {
    funnels: Array.isArray(raw.funnels) ? raw.funnels : [],
    events: Array.isArray(raw.events) ? raw.events : [],
    activeFunnelId: raw.activeFunnelId ?? null,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  }
}

function isCloudEmpty(raw: CloudAppData | undefined): boolean {
  if (!raw) return true
  const hasFunnels = Array.isArray(raw.funnels) && raw.funnels.length > 0
  const hasEvents = Array.isArray(raw.events) && raw.events.length > 0
  return !hasFunnels && !hasEvents
}

export function useStore(uid: string | null) {
  const [data, setData] = useState<AppData>(() => loadData())
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>(
    uid ? 'syncing' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)

  const dataRef = useRef(data)
  dataRef.current = data

  /** Highest updatedAt we have written or accepted from cloud */
  const syncedAt = useRef<number>(data.updatedAt ?? 0)
  const applyingRemote = useRef(false)
  const migratedForUid = useRef<string | null>(null)
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWriteAt = useRef<number | null>(null)

  // Always mirror to localStorage (guest + offline cache)
  useEffect(() => {
    if (applyingRemote.current) return
    saveData(data)
  }, [data])

  // Live Firestore sync when signed in
  useEffect(() => {
    if (!uid || !db) {
      setSyncStatus('local')
      migratedForUid.current = null
      return
    }

    setSyncStatus('syncing')
    setSyncError(null)
    const ref = doc(db, 'users', uid)

    const unsub = onSnapshot(
      ref,
      (snap) => {
        void (async () => {
          const remote = snap.exists() ? (snap.data() as CloudAppData) : undefined

          if (migratedForUid.current !== uid) {
            migratedForUid.current = uid
            if (isCloudEmpty(remote)) {
              const local = dataRef.current
              const payload = toCloud(stamp(local))
              try {
                await setDoc(ref, payload)
                syncedAt.current = payload.updatedAt
                pendingWriteAt.current = null
                applyingRemote.current = true
                setData(payload)
                saveData(payload)
                setSyncStatus('synced')
                queueMicrotask(() => {
                  applyingRemote.current = false
                })
              } catch (e) {
                setSyncStatus('error')
                setSyncError(e instanceof Error ? e.message : 'Cloud write failed')
              }
              return
            }
          }

          if (!remote || isCloudEmpty(remote)) {
            setSyncStatus('synced')
            return
          }

          const remoteAt = remote.updatedAt ?? 0
          // LWW: ignore own echoes and older cloud
          if (remoteAt <= syncedAt.current) {
            setSyncStatus('synced')
            return
          }
          // Don't clobber an in-flight newer local edit
          if (pendingWriteAt.current !== null && pendingWriteAt.current >= remoteAt) {
            return
          }

          applyingRemote.current = true
          const next = fromCloud(remote)
          syncedAt.current = remoteAt
          pendingWriteAt.current = null
          setData(next)
          saveData(next)
          setSyncStatus('synced')
          queueMicrotask(() => {
            applyingRemote.current = false
          })
        })()
      },
      (err) => {
        setSyncStatus('error')
        setSyncError(err instanceof Error ? err.message : 'Cloud listen failed')
      },
    )

    return () => {
      unsub()
      if (writeTimer.current) {
        clearTimeout(writeTimer.current)
        writeTimer.current = null
      }
    }
  }, [uid])

  // Debounced cloud writes (~300ms)
  useEffect(() => {
    if (!uid || !db || applyingRemote.current) return
    const at = data.updatedAt
    if (at == null || at <= syncedAt.current) return

    pendingWriteAt.current = at
    if (writeTimer.current) clearTimeout(writeTimer.current)
    setSyncStatus('syncing')

    writeTimer.current = setTimeout(() => {
      if (!db) return
      const payload = toCloud(dataRef.current)
      const writeAt = payload.updatedAt
      setDoc(doc(db, 'users', uid), payload)
        .then(() => {
          syncedAt.current = Math.max(syncedAt.current, writeAt)
          if (pendingWriteAt.current === writeAt) pendingWriteAt.current = null
          setSyncStatus('synced')
        })
        .catch((e) => {
          setSyncStatus('error')
          setSyncError(e instanceof Error ? e.message : 'Cloud write failed')
        })
    }, WRITE_DEBOUNCE_MS)

    return () => {
      if (writeTimer.current) {
        clearTimeout(writeTimer.current)
        writeTimer.current = null
      }
    }
  }, [data, uid])

  const mutate = useCallback((updater: (d: AppData) => AppData) => {
    setData((d) => {
      const updated = updater(d)
      if (updated === d) return d
      return stamp(updated)
    })
  }, [])

  const activeFunnel = useMemo(
    () => data.funnels.find((f) => f.id === data.activeFunnelId) ?? data.funnels[0] ?? null,
    [data.funnels, data.activeFunnelId],
  )

  const setActiveFunnel = useCallback(
    (id: string) => {
      mutate((d) => ({ ...d, activeFunnelId: id }))
    },
    [mutate],
  )

  const createFunnel = useCallback(
    (name: string) => {
      const id = uuid()
      const funnel: Funnel = {
        id,
        name: name.trim() || 'New Funnel',
        metrics: [],
        createdAt: Date.now(),
      }
      mutate((d) => ({
        ...d,
        funnels: [...d.funnels, funnel],
        activeFunnelId: id,
      }))
      return id
    },
    [mutate],
  )

  const renameFunnel = useCallback(
    (id: string, name: string) => {
      mutate((d) => ({
        ...d,
        funnels: d.funnels.map((f) =>
          f.id === id ? { ...f, name: name.trim() || f.name } : f,
        ),
      }))
    },
    [mutate],
  )

  const deleteFunnel = useCallback(
    (id: string) => {
      mutate((d) => {
        const funnel = d.funnels.find((f) => f.id === id)
        const metricIds = new Set(funnel?.metrics.map((m) => m.id) ?? [])
        const funnels = d.funnels.filter((f) => f.id !== id)
        const events = d.events.filter((e) => !metricIds.has(e.metricId))
        let activeFunnelId = d.activeFunnelId
        if (activeFunnelId === id) {
          activeFunnelId = funnels[0]?.id ?? null
        }
        return { funnels, events, activeFunnelId }
      })
    },
    [mutate],
  )

  const createMetric = useCallback(
    (funnelId: string, name: string) => {
      mutate((d) => ({
        ...d,
        funnels: d.funnels.map((f) => {
          if (f.id !== funnelId) return f
          const order = f.metrics.length
          const metric: Metric = {
            id: uuid(),
            name: name.trim() || `Metric ${order + 1}`,
            order,
          }
          return { ...f, metrics: [...f.metrics, metric] }
        }),
      }))
    },
    [mutate],
  )

  const renameMetric = useCallback(
    (funnelId: string, metricId: string, name: string) => {
      mutate((d) => ({
        ...d,
        funnels: d.funnels.map((f) => {
          if (f.id !== funnelId) return f
          return {
            ...f,
            metrics: f.metrics.map((m) =>
              m.id === metricId ? { ...m, name: name.trim() || m.name } : m,
            ),
          }
        }),
      }))
    },
    [mutate],
  )

  const deleteMetric = useCallback(
    (funnelId: string, metricId: string) => {
      mutate((d) => ({
        ...d,
        funnels: d.funnels.map((f) => {
          if (f.id !== funnelId) return f
          const metrics = sortedMetrics(f.metrics.filter((m) => m.id !== metricId)).map(
            (m, i) => ({ ...m, order: i }),
          )
          return { ...f, metrics }
        }),
        events: d.events.filter((e) => e.metricId !== metricId),
      }))
    },
    [mutate],
  )

  const reorderMetrics = useCallback(
    (funnelId: string, orderedIds: string[]) => {
      mutate((d) => ({
        ...d,
        funnels: d.funnels.map((f) => {
          if (f.id !== funnelId) return f
          const byId = new Map(f.metrics.map((m) => [m.id, m]))
          const metrics = orderedIds
            .map((id, i) => {
              const m = byId.get(id)
              return m ? { ...m, order: i } : null
            })
            .filter((m): m is Metric => m !== null)
          return { ...f, metrics }
        }),
      }))
    },
    [mutate],
  )

  const increment = useCallback(
    (metricId: string) => {
      const event: Event = {
        id: uuid(),
        metricId,
        timestamp: Date.now(),
        delta: 1,
      }
      mutate((d) => ({ ...d, events: [...d.events, event] }))
    },
    [mutate],
  )

  const decrement = useCallback(
    (metricId: string) => {
      mutate((d) => {
        if (todayCount(d.events, metricId) <= 0) return d
        const event: Event = {
          id: uuid(),
          metricId,
          timestamp: Date.now(),
          delta: -1,
        }
        return { ...d, events: [...d.events, event] }
      })
    },
    [mutate],
  )

  const undoLast = useCallback(
    (metricId: string) => {
      mutate((d) => {
        let lastIdx = -1
        for (let i = d.events.length - 1; i >= 0; i--) {
          if (d.events[i].metricId === metricId) {
            lastIdx = i
            break
          }
        }
        if (lastIdx === -1) return d
        const events = [...d.events]
        events.splice(lastIdx, 1)
        return { ...d, events }
      })
    },
    [mutate],
  )

  const setTodayCount = useCallback(
    (metricId: string, next: number) => {
      const value = Math.max(0, Math.floor(Number(next)))
      if (!Number.isFinite(value)) return
      mutate((d) => {
        const current = todayCount(d.events, metricId)
        const delta = value - current
        if (delta === 0) return d
        const event: Event = {
          id: uuid(),
          metricId,
          timestamp: Date.now(),
          delta,
        }
        return { ...d, events: [...d.events, event] }
      })
    },
    [mutate],
  )


  const resetAll = useCallback(async () => {
    const blank = stamp(emptyData())
    applyingRemote.current = true
    setData(blank)
    clearLocalData()
    saveData(blank)
    syncedAt.current = blank.updatedAt ?? 0
    pendingWriteAt.current = blank.updatedAt ?? null
    if (uid && db) {
      try {
        await setDoc(doc(db, 'users', uid), toCloud(blank))
        setSyncStatus('synced')
        setSyncError(null)
      } catch (e) {
        setSyncStatus('error')
        setSyncError(e instanceof Error ? e.message : 'Failed to clear cloud')
      }
    } else {
      setSyncStatus('local')
    }
    queueMicrotask(() => {
      applyingRemote.current = false
    })
  }, [uid])

  return {
    data,
    activeFunnel,
    syncStatus,
    syncError,
    resetAll,
    setActiveFunnel,
    createFunnel,
    renameFunnel,
    deleteFunnel,
    createMetric,
    renameMetric,
    deleteMetric,
    reorderMetrics,
    increment,
    decrement,
    undoLast,
    setTodayCount,
  }
}
