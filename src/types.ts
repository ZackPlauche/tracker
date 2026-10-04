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
  /** Sidebar order within its folder (or the top level). Missing sorts after numbered ones, by createdAt. */
  order?: number
  /** Folder this funnel lives in. Missing = top level. */
  folderId?: string
}

export type Folder = {
  id: string
  name: string
  order?: number
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
  /** Sidebar folders. Missing = no folders, every funnel is top level. */
  folders?: Folder[]
}

export type CloudAppData = {
  funnels: Funnel[]
  events: Event[]
  activeFunnelId: string | null
  updatedAt: number
  accentColor?: string
  folders?: Folder[]
}

export type ViewTab = 'count' | 'charts' | 'sheet'

export type ChartPeriod = 'today' | '7d' | '30d' | 'all'
