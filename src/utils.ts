import type { Event, Metric } from './types'
import type { ChartPeriod } from './types'

export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function periodStart(period: ChartPeriod): number | null {
  const now = Date.now()
  switch (period) {
    case 'today':
      return startOfDay(now)
    case '7d':
      return startOfDay(now) - 6 * 86400000
    case '30d':
      return startOfDay(now) - 29 * 86400000
    case 'all':
      return null
  }
}

export function sumEvents(
  events: Event[],
  metricId: string,
  from: number | null = null,
  to: number | null = null,
): number {
  let total = 0
  for (const e of events) {
    if (e.metricId !== metricId) continue
    if (from !== null && e.timestamp < from) continue
    if (to !== null && e.timestamp >= to) continue
    total += e.delta
  }
  return total
}

export function todayCount(events: Event[], metricId: string): number {
  return sumEvents(events, metricId, startOfDay())
}

export function formatDayLabel(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatDayKey(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function sortedMetrics(metrics: Metric[]): Metric[] {
  return [...metrics].sort((a, b) => a.order - b.order)
}

export function getDayRange(from: number | null, events: Event[]): number[] {
  const days: number[] = []
  if (from === null) {
    if (events.length === 0) return [startOfDay()]
    const min = Math.min(...events.map((e) => e.timestamp))
    let cur = startOfDay(min)
    const end = startOfDay()
    while (cur <= end) {
      days.push(cur)
      cur += 86400000
    }
    return days
  }
  let cur = from
  const end = startOfDay()
  while (cur <= end) {
    days.push(cur)
    cur += 86400000
  }
  return days
}
