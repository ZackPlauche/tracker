import type { Event, Metric, MetricKind } from './types'
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

export function dayCount(events: Event[], metricId: string, dayStart: number): number {
  return sumEvents(events, metricId, dayStart, dayStart + 86400000)
}

export function todayCount(events: Event[], metricId: string): number {
  return dayCount(events, metricId, startOfDay())
}

/** Timestamp to stamp new events for a selected day (noon for past days, now for today). */
export function eventTimestampForDay(dayStart: number): number {
  const today = startOfDay()
  if (dayStart === today) return Date.now()
  return dayStart + 12 * 60 * 60 * 1000
}

export function selectedDayLabel(dayStart: number): string {
  const today = startOfDay()
  if (dayStart === today) return 'Today'
  if (dayStart === today - 86400000) return 'Yesterday'
  return new Date(dayStart).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
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

export const DEFAULT_ACCENT = '#6366f1'

/** Preset box colors. First swatch is the original indigo. */
export const ACCENT_SWATCHES = [
  '#6366f1',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#a78bfa',
  '#ec4899',
  '#f59e0b',
  '#ef4444',
] as const

export function metricKind(metric: Metric): MetricKind {
  return metric.kind === 'in' || metric.kind === 'out' ? metric.kind : 'count'
}


export function lightenHex(hex: string, amount = 0.28): string {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n) || full.length !== 6) return hex
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function resolveAccent(funnelColor?: string, globalColor?: string): string {
  return funnelColor || globalColor || DEFAULT_ACCENT
}

export function dayEntries(events: Event[], metricId: string, dayStart: number): Event[] {
  const end = dayStart + 86400000
  return events.filter(
    (e) => e.metricId === metricId && e.timestamp >= dayStart && e.timestamp < end,
  )
}

export function formatAmount(n: number): string {
  const abs = Math.abs(n)
  const text = abs.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return n < 0 ? `−${text}` : text
}

export function moneyDayTotals(
  metrics: Metric[],
  events: Event[],
  dayStart: number,
): { moneyIn: number; moneyOut: number; net: number } {
  let moneyIn = 0
  let moneyOut = 0
  for (const m of metrics) {
    const kind = metricKind(m)
    if (kind === 'count') continue
    const sum = dayCount(events, m.id, dayStart)
    if (kind === 'in') moneyIn += sum
    else moneyOut += -sum
  }
  return { moneyIn, moneyOut, net: moneyIn - moneyOut }
}
