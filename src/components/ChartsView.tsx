import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import type { ChartPeriod, Event, Funnel as FunnelType } from '../types'
import { formatDayLabel, getDayRange, periodStart, sortedMetrics, sumEvents } from '../utils'

type Props = {
  funnel: FunnelType
  events: Event[]
  period: ChartPeriod
  onPeriodChange: (p: ChartPeriod) => void
}

const PERIODS: { id: ChartPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'All' },
]

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a78bfa']

export function ChartsView({ funnel, events, period, onPeriodChange }: Props) {
  const metrics = sortedMetrics(funnel.metrics)
  const from = periodStart(period)
  const metricIds = useMemo(() => new Set(metrics.map((m) => m.id)), [metrics])
  const funnelEvents = useMemo(
    () => events.filter((e) => metricIds.has(e.metricId)),
    [events, metricIds],
  )

  const funnelData = useMemo(
    () =>
      metrics.map((m, i) => ({
        name: m.name,
        value: Math.max(0, sumEvents(funnelEvents, m.id, from)),
        fill: COLORS[i % COLORS.length],
      })),
    [metrics, funnelEvents, from],
  )

  const barData = useMemo(() => {
    const days = getDayRange(from, funnelEvents)
    return days.map((dayStart) => {
      const dayEnd = dayStart + 86400000
      const row: Record<string, string | number> = {
        label: formatDayLabel(dayStart),
      }
      for (const m of metrics) {
        row[m.name] = Math.max(0, sumEvents(funnelEvents, m.id, dayStart, dayEnd))
      }
      return row
    })
  }, [from, funnelEvents, metrics])

  const hasAny = funnelData.some((d) => d.value > 0)

  if (metrics.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <h2 className="mb-1 text-lg font-semibold text-text">Nothing to chart</h2>
        <p className="text-sm text-text-dim">Add metrics on the Count tab first.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 pb-6">
      <div className="flex gap-1 rounded-xl bg-surface-card p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodChange(p.id)}
            className={`tap-feedback flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
              period === p.id
                ? 'bg-accent text-white shadow'
                : 'text-text-dim hover:text-text'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!hasAny ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-card px-4 py-10 text-center">
          <p className="text-sm text-text-dim">No counts in this period yet. Tap +1 on Count.</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-border-subtle bg-surface-card p-3">
            <h3 className="mb-3 px-1 text-sm font-semibold text-text">Funnel</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a24',
                      border: '1px solid #2a2a3a',
                      borderRadius: 12,
                      color: '#f4f4f8',
                    }}
                  />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#f4f4f8" stroke="none" dataKey="name" />
                    {funnelData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.fill ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 px-1">
              {funnelData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                  {d.name}: <span className="font-semibold text-text tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface-card p-3">
            <h3 className="mb-3 px-1 text-sm font-semibold text-text">Daily bars</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#2a2a3a' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a24',
                      border: '1px solid #2a2a3a',
                      borderRadius: 12,
                      color: '#f4f4f8',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                  {metrics.map((m, i) => (
                    <Bar
                      key={m.id}
                      dataKey={m.name}
                      fill={COLORS[i % COLORS.length]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
