export type Metric = {
  id: string
  name: string
  order: number
}

export type Funnel = {
  id: string
  name: string
  metrics: Metric[]
  createdAt: number
}

export type Event = {
  id: string
  metricId: string
  timestamp: number
  delta: number
}

export type AppData = {
  funnels: Funnel[]
  events: Event[]
  activeFunnelId: string | null
  /** Last local/cloud write time — used for LWW sync */
  updatedAt?: number
}

export type CloudAppData = {
  funnels: Funnel[]
  events: Event[]
  activeFunnelId: string | null
  updatedAt: number
}

export type ViewTab = 'count' | 'charts' | 'sheet'

export type ChartPeriod = 'today' | '7d' | '30d' | 'all'
