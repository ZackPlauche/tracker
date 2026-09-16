import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Event, Funnel, Metric } from '../types'
import { dayCount, sortedMetrics } from '../utils'
import { DayScroller } from './DayScroller'
import { MetricCard } from './MetricCard'

type Props = {
  funnel: Funnel
  events: Event[]
  selectedDayStart: number
  onSelectedDayChange: (dayStart: number) => void
  onIncrement: (metricId: string) => void
  onDecrement: (metricId: string) => void
  onUndo: (metricId: string) => void
  onSetCount: (metricId: string, value: number) => void
  onRenameMetric: (metricId: string, name: string) => void
  onDeleteMetric: (metricId: string) => void
  onCreateMetric: (name: string) => void
  onReorder: (orderedIds: string[]) => void
}

function SortableMetricCard({
  metric,
  count,
  onIncrement,
  onDecrement,
  onUndo,
  onSetCount,
  onRename,
  onDelete,
}: {
  metric: Metric
  count: number
  onIncrement: () => void
  onDecrement: () => void
  onUndo: () => void
  onSetCount: (value: number) => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: metric.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <MetricCard
        metric={metric}
        todayCount={count}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onUndo={onUndo}
        onSetCount={onSetCount}
        onRename={onRename}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  )
}

export function CountView({
  funnel,
  events,
  selectedDayStart,
  onSelectedDayChange,
  onIncrement,
  onDecrement,
  onUndo,
  onSetCount,
  onRenameMetric,
  onDeleteMetric,
  onCreateMetric,
  onReorder,
}: Props) {
  const metrics = sortedMetrics(funnel.metrics)
  const metricIds = useMemo(() => metrics.map((m) => m.id), [metrics])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  )

  function handleCreate() {
    if (!newName.trim()) return
    onCreateMetric(newName)
    setNewName('')
    setAdding(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = metricIds.indexOf(String(active.id))
    const newIndex = metricIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(metricIds, oldIndex, newIndex))
  }

  const dayScroller = (
    <DayScroller selectedDayStart={selectedDayStart} onChange={onSelectedDayChange} />
  )

  if (metrics.length === 0 && !adding) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3 pb-4">
        {dayScroller}
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
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-3 pb-4">
      {dayScroller}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={metricIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 auto-rows-fr">
            {metrics.map((m) => (
              <SortableMetricCard
                key={m.id}
                metric={m}
                count={dayCount(events, m.id, selectedDayStart)}
                onIncrement={() => onIncrement(m.id)}
                onDecrement={() => onDecrement(m.id)}
                onUndo={() => onUndo(m.id)}
                onSetCount={(value) => onSetCount(m.id, value)}
                onRename={(name) => onRenameMetric(m.id, name)}
                onDelete={() => onDeleteMetric(m.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
