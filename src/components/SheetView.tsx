import { useMemo, useState } from 'react'
import type { Event, Funnel } from '../types'
import { downloadSheetCsv, downloadSheetPdf } from '../exportSheet'
import { formatDayKey, formatDayLabel, getDayRange, sortedMetrics, startOfDay, sumEvents } from '../utils'

type Props = {
  funnel: Funnel
  events: Event[]
}

type ExportSpan = 'data' | '7' | '14' | '30' | 'all'

export function SheetView({ funnel, events }: Props) {
  const [exporting, setExporting] = useState(false)
  const [exportSpan, setExportSpan] = useState<ExportSpan>('data')
  const metrics = sortedMetrics(funnel.metrics)
  const metricIds = useMemo(() => new Set(metrics.map((m) => m.id)), [metrics])
  const funnelEvents = useMemo(
    () => events.filter((e) => metricIds.has(e.metricId)),
    [events, metricIds],
  )

  const rows = useMemo(() => {
    const days = getDayRange(null, funnelEvents)
    // newest first for phone-friendly scanning
    return [...days].reverse().map((dayStart) => {
      const dayEnd = dayStart + 86400000
      const cells = metrics.map((m) => Math.max(0, sumEvents(funnelEvents, m.id, dayStart, dayEnd)))
      return {
        key: formatDayKey(dayStart),
        label: formatDayLabel(dayStart),
        isToday: dayStart === startOfDay(),
        cells,
        total: cells.reduce((a, b) => a + b, 0),
      }
    })
  }, [funnelEvents, metrics])

  const visibleRows = useMemo(() => {
    if (exportSpan === 'data') return rows.filter((row) => row.total > 0)
    if (exportSpan === 'all') return rows
    return rows.slice(0, Number(exportSpan))
  }, [rows, exportSpan])

  if (metrics.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <h2 className="mb-1 text-lg font-semibold text-text">Empty sheet</h2>
        <p className="text-sm text-text-dim">Add metrics on the Count tab to see daily totals.</p>
      </div>
    )
  }

  if (rows.every((r) => r.total === 0)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <h2 className="mb-1 text-lg font-semibold text-text">No data yet</h2>
        <p className="text-sm text-text-dim">Counts will appear here day by day.</p>
      </div>
    )
  }

  const sheet = {
    funnelName: funnel.name,
    headers: metrics.map((m) => m.name),
    rows: [...visibleRows].reverse().map((row) => ({ label: row.label, cells: row.cells })),
  }

  async function exportPdf() {
    setExporting(true)
    try {
      await downloadSheetPdf(sheet)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3 pb-4">
      <div className="mb-2 flex items-center justify-end gap-2">
        <label className="mr-auto text-[11px] text-text-dim">
          <span className="sr-only">Dates to show</span>
          <select
            value={exportSpan}
            onChange={(e) => setExportSpan(e.target.value as ExportSpan)}
            className="rounded-xl bg-surface-card px-2 py-2 text-xs font-semibold text-text-muted"
          >
            <option value="data">Days with data</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">Every day</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => downloadSheetCsv(sheet)}
          className="tap-feedback rounded-xl bg-surface-card px-3 py-2 text-xs font-semibold text-text-muted hover:bg-surface-hover hover:text-text"
        >
          CSV
        </button>
        <button
          type="button"
          onClick={() => {
            void exportPdf()
          }}
          disabled={exporting}
          className="tap-feedback rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {exporting ? 'Making PDF…' : 'PDF'}
        </button>
      </div>
      <div className="sheet-scroll flex-1 overflow-auto rounded-2xl border border-border-subtle bg-surface-card">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface-raised">
            <tr>
              <th className="sticky left-0 z-20 bg-surface-raised px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-dim border-b border-border">
                Date
              </th>
              {metrics.map((m) => (
                <th
                  key={m.id}
                  className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-dim border-b border-border whitespace-nowrap"
                >
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-border-subtle ${
                  row.isToday ? 'bg-accent/10' : 'hover:bg-surface-hover/50'
                }`}
              >
                <td
                  className={`sticky left-0 z-10 px-3 py-3 font-medium whitespace-nowrap ${
                    row.isToday ? 'bg-surface-card text-accent-hover' : 'bg-surface-card text-text'
                  }`}
                >
                  {row.label}
                  {row.isToday && (
                    <span className="ml-1.5 text-[10px] font-normal text-accent">today</span>
                  )}
                </td>
                {row.cells.map((val, i) => (
                  <td
                    key={metrics[i].id}
                    className="px-3 py-3 text-right tabular-nums text-text-muted"
                  >
                    {val === 0 ? (
                      <span className="text-text-dim/40">—</span>
                    ) : (
                      val
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
