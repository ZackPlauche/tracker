import { useState, type DragEvent } from 'react'
import type { Metric } from '../types'

type Props = {
  metric: Metric
  todayCount: number
  onIncrement: () => void
  onDecrement: () => void
  onUndo: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  dragHandleProps?: {
    draggable: boolean
    onDragStart: (e: DragEvent) => void
    onDragOver: (e: DragEvent) => void
    onDrop: (e: DragEvent) => void
    onDragEnd: () => void
  }
  isDragging?: boolean
  isDragOver?: boolean
}

export function MetricCard({
  metric,
  todayCount,
  onIncrement,
  onDecrement,
  onUndo,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  dragHandleProps,
  isDragging,
  isDragOver,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(metric.name)

  function commitRename() {
    if (name.trim()) onRename(name)
    else setName(metric.name)
    setEditing(false)
  }

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl bg-surface-card border border-border-subtle shadow-lg transition-all ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${isDragOver ? 'ring-2 ring-accent' : ''}`}
      {...dragHandleProps}
    >
      <div className="flex items-start justify-between gap-1 px-3 pt-3 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className="mt-0.5 cursor-grab touch-none text-text-dim active:cursor-grabbing"
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </span>
          {editing ? (
            <form
              className="min-w-0 flex-1"
              onSubmit={(e) => {
                e.preventDefault()
                commitRename()
              }}
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitRename}
                className="w-full rounded-lg bg-surface px-2 py-1 text-sm font-semibold text-text outline-none ring-1 ring-accent"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setName(metric.name)
                setEditing(true)
              }}
              className="tap-feedback min-w-0 truncate text-left text-sm font-semibold text-text hover:text-accent-hover"
              title="Tap to rename"
            >
              {metric.name}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="tap-feedback flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-hover disabled:opacity-30"
            aria-label="Move earlier in funnel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="tap-feedback flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-hover disabled:opacity-30"
            aria-label="Move later in funnel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete metric “${metric.name}”?`)) onDelete()
            }}
            className="tap-feedback flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-danger/15 hover:text-danger"
            aria-label={`Delete ${metric.name}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onIncrement}
        className="tap-feedback mx-3 mb-2 flex min-h-[7.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-accent text-white shadow-md shadow-accent/25 transition-colors hover:bg-accent-hover active:scale-[0.97]"
        aria-label={`Add 1 to ${metric.name}. Current count ${todayCount}`}
      >
        <span className="text-5xl font-bold tabular-nums leading-none tracking-tight">
          {todayCount}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">
          tap to count
        </span>
      </button>

      <div className="flex gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={onDecrement}
          className="tap-feedback flex h-11 flex-1 items-center justify-center rounded-xl bg-surface-hover text-sm font-medium text-text-muted hover:bg-border hover:text-text"
          aria-label={`Subtract 1 from ${metric.name}`}
        >
          −1
        </button>
        <button
          type="button"
          onClick={onUndo}
          className="tap-feedback flex h-11 flex-1 items-center justify-center rounded-xl bg-surface-hover text-sm font-medium text-text-muted hover:bg-border hover:text-text"
          aria-label={`Undo last for ${metric.name}`}
        >
          Undo
        </button>
      </div>
    </div>
  )
}
