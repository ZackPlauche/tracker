import { useState } from 'react'
import type { Event, Funnel } from '../types'
import { sortedMetrics, todayCount } from '../utils'
import { MetricCard } from './MetricCard'

type Props = {
  funnel: Funnel
  events: Event[]
  onIncrement: (metricId: string) => void
  onDecrement: (metricId: string) => void
  onUndo: (metricId: string) => void
  onRenameMetric: (metricId: string, name: string) => void
  onDeleteMetric: (metricId: string) => void
  onCreateMetric: (name: string) => void
  onReorder: (orderedIds: string[]) => void
}

export function CountView({
  funnel,
  events,
  onIncrement,
  onDecrement,
  onUndo,
  onRenameMetric,
  onDeleteMetric,
  onCreateMetric,
  onReorder,
}: Props) {
  const metrics = sortedMetrics(funnel.metrics)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    onCreateMetric(newName)
    setNewName('')
    setAdding(false)
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }
    const ids = metrics.map((m) => m.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    ids.splice(from, 1)
    ids.splice(to, 0, dragId)
    onReorder(ids)
    setDragId(null)
    setOverId(null)
  }

  function moveMetric(id: string, dir: -1 | 1) {
    const ids = metrics.map((m) => m.id)
    const from = ids.indexOf(id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    onReorder(ids)
  }

  if (metrics.length === 0 && !adding) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-card text-accent">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-text">No metrics yet</h2>
        <p className="mb-6 max-w-xs text-sm text-text-dim">
          Add steps in your funnel — like Opens, Numbers, or Walk-ins — then tap +1 as you go.
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="tap-feedback rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Add first metric
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-3 pb-4">
      <div className="grid grid-cols-2 gap-3 auto-rows-fr">
        {metrics.map((m, index) => (
          <MetricCard
            key={m.id}
            metric={m}
            todayCount={todayCount(events, m.id)}
            onIncrement={() => onIncrement(m.id)}
            onDecrement={() => onDecrement(m.id)}
            onUndo={() => onUndo(m.id)}
            onRename={(name) => onRenameMetric(m.id, name)}
            onDelete={() => onDeleteMetric(m.id)}
            onMoveUp={() => moveMetric(m.id, -1)}
            onMoveDown={() => moveMetric(m.id, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < metrics.length - 1}
            isDragging={dragId === m.id}
            isDragOver={overId === m.id && dragId !== m.id}
            dragHandleProps={{
              draggable: true,
              onDragStart: (e) => {
                setDragId(m.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', m.id)
              },
              onDragOver: (e) => {
                e.preventDefault()
                setOverId(m.id)
              },
              onDrop: (e) => {
                e.preventDefault()
                handleDrop(m.id)
              },
              onDragEnd: () => {
                setDragId(null)
                setOverId(null)
              },
            }}
          />
        ))}
      </div>

      {adding ? (
        <form
          className="rounded-2xl border border-border bg-surface-card p-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Metric name"
            className="w-full rounded-xl bg-surface px-3 py-3 text-sm text-text outline-none ring-1 ring-border focus:ring-accent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="tap-feedback flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setNewName('')
              }}
              className="tap-feedback rounded-xl bg-surface-hover px-4 py-2.5 text-sm text-text-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="tap-feedback flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-medium text-text-muted hover:border-accent/50 hover:text-accent-hover"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add metric
        </button>
      )}
    </div>
  )
}
