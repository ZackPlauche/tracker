import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { v4 as uuid } from 'uuid'
import { db } from '../lib/firebase'
import { clearLocalData, emptyData, loadData, saveData } from '../storage'
import type { AppData, CloudAppData, Event, Funnel, Metric, MetricKind } from '../types'
import {
  dayCount,
  eventTimestampForDay,
  sortedMetrics,
  startOfDay,
} from '../utils'

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
    ...(data.accentColor ? { accentColor: data.accentColor } : {}),
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
    ...(typeof raw.accentColor === 'string' && raw.accentColor
      ? { accentColor: raw.accentColor }
      : {}),
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

    // Fresh handshake: never treat blank local updatedAt as "already synced"
    syncedAt.current = 0
    pendingWriteAt.current = null
    migratedForUid.current = null

    setSyncStatus('syncing')
    setSyncError(null)
    const ref = doc(db, 'users', uid)

    const unsub = onSnapshot(
      ref,
      (snap) => {
        void (async () => {
          const remote = snap.exists() ? (snap.data() as CloudAppData) : undefined

          // First snapshot for this uid: hydrate from cloud if it has data
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
                setSyncError(null)
                queueMicrotask(() => {
                  applyingRemote.current = false
                })
              } catch (e) {
                setSyncStatus('error')
                setSyncError(e instanceof Error ? e.message : 'Cloud write failed')
              }
              return
            }

            // Cloud has funnels/events: always apply (ignore local LWW for first hydrate)
            applyingRemote.current = true
            const next = fromCloud(remote!)
            syncedAt.current = next.updatedAt ?? remote!.updatedAt ?? 0
            pendingWriteAt.current = null
            setData(next)
            saveData(next)
            setSyncStatus('synced')
            setSyncError(null)
            queueMicrotask(() => {
              applyingRemote.current = false
            })
            return
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
          setSyncError(null)
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

  const activeFunnel = useMemo(() => {
    const visible = data.funnels.filter((f) => !f.archived)
    return visible.find((f) => f.id === data.activeFunnelId) ?? visible[0] ?? null
  }, [data.funnels, data.activeFunnelId])

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
          activeFunnelId = funnels.find((f) => !f.archived)?.id ?? null
        }
        return { ...d, funnels, events, activeFunnelId }
      })
    },
    [mutate],
  )


  const archiveFunnel = useCallback(
    (id: string) => {
      mutate((d) => {
        const funnels = d.funnels.map((f) => (f.id === id ? { ...f, archived: true } : f))
        let activeFunnelId = d.activeFunnelId
        if (activeFunnelId === id) {
          activeFunnelId = funnels.find((f) => !f.archived)?.id ?? null
        }
        return { ...d, funnels, activeFunnelId }
      })
    },
    [mutate],
  )

  const restoreFunnel = useCallback(
    (id: string) => {
      mutate((d) => ({
        ...d,
        funnels: d.funnels.map((f) => (f.id === id ? { ...f, archived: false } : f)),
        activeFunnelId: id,
      }))
    },
    [mutate],
  )

  const createMetric = useCallback(
    (funnelId: string, name: string, kind: MetricKind = 'count') => {
      mutate((d) => ({
        ...d,
        funnels: d.funnels.map((f) => {
          if (f.id !== funnelId) return f
          const order = f.metrics.length
          const metric: Metric = {
            id: uuid(),
            name: name.trim() || `Metric ${order + 1}`,
            order,
            ...(kind === 'in' || kind === 'out' ? { kind } : {}),
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
    (metricId: string, dayStart: number = startOfDay()) => {
      const event: Event = {
        id: uuid(),
        metricId,
        timestamp: eventTimestampForDay(dayStart),
        delta: 1,
      }
      mutate((d) => ({ ...d, events: [...d.events, event] }))
    },
    [mutate],
  )

  const decrement = useCallback(
    (metricId: string, dayStart: number = startOfDay()) => {
      mutate((d) => {
        if (dayCount(d.events, metricId, dayStart) <= 0) return d
        const event: Event = {
          id: uuid(),
          metricId,
          timestamp: eventTimestampForDay(dayStart),
          delta: -1,
        }
        return { ...d, events: [...d.events, event] }
      })
    },
    [mutate],
  )

  const undoLast = useCallback(
    (metricId: string, dayStart: number = startOfDay()) => {
      mutate((d) => {
        const dayEnd = dayStart + 86400000
        let lastIdx = -1
        for (let i = d.events.length - 1; i >= 0; i--) {
          const e = d.events[i]
          if (e.metricId === metricId && e.timestamp >= dayStart && e.timestamp < dayEnd) {
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

  const setDayCount = useCallback(
    (metricId: string, next: number, dayStart: number = startOfDay()) => {
      const value = Math.max(0, Math.floor(Number(next)))
      if (!Number.isFinite(value)) return
      mutate((d) => {
        const current = dayCount(d.events, metricId, dayStart)
        const delta = value - current
        if (delta === 0) return d
        const event: Event = {
          id: uuid(),
          metricId,
          timestamp: eventTimestampForDay(dayStart),
          delta,
        }
        return { ...d, events: [...d.events, event] }
      })
    },
    [mutate],
  )


  const addAmount = useCallback(
    (metricId: string, amount: number, note: string, dayStart: number = startOfDay()) => {
      const value = Math.abs(Number(amount))
      if (!Number.isFinite(value) || value <= 0) return
      const trimmed = note.trim()
      mutate((d) => {
        let kind: MetricKind = 'count'
        for (const f of d.funnels) {
          const m = f.metrics.find((metric) => metric.id === metricId)
          if (m) {
            kind = m.kind === 'in' || m.kind === 'out' ? m.kind : 'count'
            break
          }
        }
        const delta = kind === 'out' ? -value : value
        if (delta === 0) return d
        const event: Event = {
          id: uuid(),
          metricId,
          timestamp: eventTimestampForDay(dayStart),
          delta,
          ...(trimmed ? { note: trimmed } : {}),
        }
        return { ...d, events: [...d.events, event] }
      })
    },
    [mutate],
  )

  const removeEvent = useCallback(
    (eventId: string) => {
      mutate((d) => {
        if (!d.events.some((e) => e.id === eventId)) return d
        return { ...d, events: d.events.filter((e) => e.id !== eventId) }
      })
    },
    [mutate],
  )

  const setAccentColor = useCallback(
    (color: string) => {
      mutate((d) => {
        if (d.accentColor === color) return d
        return { ...d, accentColor: color }
      })
    },
    [mutate],
  )

  const setFunnelColor = useCallback(
    (id: string, color: string | null) => {
      mutate((d) => {
        let changed = false
        const funnels = d.funnels.map((f) => {
          if (f.id !== id) return f
          if (!color) {
            if (!f.color) return f
            changed = true
            const next = { ...f }
            delete next.color
            return next
          }
          if (f.color === color) return f
          changed = true
          return { ...f, color }
        })
        if (!changed) return d
        return { ...d, funnels }
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
    archiveFunnel,
    restoreFunnel,
    createMetric,
    renameMetric,
    deleteMetric,
    reorderMetrics,
    increment,
    decrement,
    undoLast,
    setDayCount,
    addAmount,
    removeEvent,
    setAccentColor,
    setFunnelColor,
  }
}
