import { useCallback, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { loadData, saveData } from '../storage'
import type { AppData, Event, Funnel, Metric } from '../types'
import { sortedMetrics, todayCount } from '../utils'

export function useStore() {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const activeFunnel = useMemo(
    () => data.funnels.find((f) => f.id === data.activeFunnelId) ?? data.funnels[0] ?? null,
    [data.funnels, data.activeFunnelId],
  )

  const setActiveFunnel = useCallback((id: string) => {
    setData((d) => ({ ...d, activeFunnelId: id }))
  }, [])

  const createFunnel = useCallback((name: string) => {
    const id = uuid()
    const funnel: Funnel = {
      id,
      name: name.trim() || 'New Funnel',
      metrics: [],
      createdAt: Date.now(),
    }
    setData((d) => ({
      ...d,
      funnels: [...d.funnels, funnel],
      activeFunnelId: id,
    }))
    return id
  }, [])

  const renameFunnel = useCallback((id: string, name: string) => {
    setData((d) => ({
      ...d,
      funnels: d.funnels.map((f) =>
        f.id === id ? { ...f, name: name.trim() || f.name } : f,
      ),
    }))
  }, [])

  const deleteFunnel = useCallback((id: string) => {
    setData((d) => {
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
  }, [])

  const createMetric = useCallback((funnelId: string, name: string) => {
    setData((d) => ({
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
  }, [])

  const renameMetric = useCallback((funnelId: string, metricId: string, name: string) => {
    setData((d) => ({
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
  }, [])

  const deleteMetric = useCallback((funnelId: string, metricId: string) => {
    setData((d) => ({
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
  }, [])

  const reorderMetrics = useCallback((funnelId: string, orderedIds: string[]) => {
    setData((d) => ({
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
  }, [])

  const increment = useCallback((metricId: string) => {
    const event: Event = {
      id: uuid(),
      metricId,
      timestamp: Date.now(),
      delta: 1,
    }
    setData((d) => ({ ...d, events: [...d.events, event] }))
  }, [])

  const decrement = useCallback((metricId: string) => {
    setData((d) => {
      if (todayCount(d.events, metricId) <= 0) return d
      const event: Event = {
        id: uuid(),
        metricId,
        timestamp: Date.now(),
        delta: -1,
      }
      return { ...d, events: [...d.events, event] }
    })
  }, [])

  const undoLast = useCallback((metricId: string) => {
    setData((d) => {
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
  }, [])

  return {
    data,
    activeFunnel,
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
  }
}
