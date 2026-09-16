import { Icon } from '@iconify/react'
import { selectedDayLabel, startOfDay } from '../utils'

const DAY_SPAN = 30

type Props = {
  selectedDayStart: number
  onChange: (dayStart: number) => void
}

export function DayScroller({ selectedDayStart, onChange }: Props) {
  const today = startOfDay()
  const oldest = today - DAY_SPAN * 86400000
  const sliderValue = Math.round((selectedDayStart - oldest) / 86400000)
  const canPrev = selectedDayStart > oldest
  const canNext = selectedDayStart < today

  function shift(delta: number) {
    const next = startOfDay(selectedDayStart + delta * 86400000)
    if (next < oldest || next > today) return
    onChange(next)
  }

  function onSlider(value: number) {
    const clamped = Math.max(0, Math.min(DAY_SPAN, Math.round(value)))
    onChange(oldest + clamped * 86400000)
  }

  return (
    <div className="shrink-0 rounded-2xl border border-border-subtle bg-surface-card px-2 py-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="tap-feedback flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-30"
          aria-label="Previous day"
        >
          <Icon icon="mdi:chevron-left" width={24} height={24} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-text">{selectedDayLabel(selectedDayStart)}</p>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          className="tap-feedback flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-30"
          aria-label="Next day"
        >
          <Icon icon="mdi:chevron-right" width={24} height={24} aria-hidden />
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={DAY_SPAN}
        step={1}
        value={sliderValue}
        onChange={(e) => onSlider(Number(e.target.value))}
        className="mt-1 w-full accent-accent"
        aria-label="Select day in last 30 days"
      />
    </div>
  )
}
