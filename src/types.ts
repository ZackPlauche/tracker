export type MetricKind = 'count' | 'in' | 'out'

export type Metric = {
  id: string
  name: string
  order: number
  /** Missing or count = tap counter. in/out = cash amount entries. */
  kind?: MetricKind
}

export type Funnel = {
  id: string
  name: string
  metrics: Metric[]
  createdAt: number
  /** Hidden from the main list; still stored and restorable */
  archived?: boolean
  /** Box color override. Missing = use the global accent. */
  color?: string
}

export type Event = {
  id: string
  metricId: string
  timestamp: number
  delta: number
  /** Optional note on a cash entry */
  note?: string
}

export type AppData = {
  funnels: Funnel[]
  events: Event[]
  activeFunnelId: string | null
  /** Last local/cloud write time — used for LWW sync */
  updatedAt?: number
  /** Default box color for funnels that have no color of their own */
  accentColor?: string
}

export type CloudAppData = {
  funnels: Funnel[]
  events: Event[]
  activeFunnelId: string | null
  updatedAt: number
  accentColor?: string
}

export type ViewTab = 'count' | 'charts' | 'sheet'

export type ChartPeriod = 'today' | '7d' | '30d' | 'all'
