import { useEffect, useMemo, useRef } from 'react'
import { startOfDay } from '../utils'

const DAY_SPAN = 30

type Props = {
  selectedDayStart: number
  onChange: (dayStart: number) => void
}

function weekdayShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short' })
}

function dayNumber(ts: number): string {
  return String(new Date(ts).getDate())
}

function headerLabel(dayStart: number): string {
  const today = startOfDay()
  const monthDay = new Date(dayStart).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  })
  if (dayStart === today) return `Today, ${monthDay}`
  if (dayStart === today - 86400000) return `Yesterday, ${monthDay}`
  return new Date(dayStart).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DayScroller({ selectedDayStart, onChange }: Props) {
  const today = startOfDay()
  const oldest = today - DAY_SPAN * 86400000
  const selectedRef = useRef<HTMLButtonElement>(null)

  const days = useMemo(() => {
    const list: number[] = []
    for (let i = 0; i <= DAY_SPAN; i++) {
      list.push(oldest + i * 86400000)
    }
    return list
  }, [oldest])

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [selectedDayStart])

  return (
    <div className="shrink-0 space-y-2">
      <p className="px-1 text-center text-sm font-semibold text-text">
        {headerLabel(selectedDayStart)}
      </p>
      <div
        className="flex gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Select day"
      >
        {days.map((dayStart) => {
          const selected = dayStart === selectedDayStart
          return (
            <button
              key={dayStart}
              ref={selected ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(dayStart)}
              className={`tap-feedback flex w-12 shrink-0 flex-col items-center justify-center rounded-2xl px-1 py-2 transition-colors ${
                selected
                  ? 'bg-accent text-white shadow-md shadow-accent/25'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              <span
                className={`text-[11px] font-medium leading-none ${
                  selected ? 'text-white/90' : 'text-text-muted'
                }`}
              >
                {weekdayShort(dayStart)}
              </span>
              <span
                className={`mt-1.5 text-base font-semibold tabular-nums leading-none ${
                  selected ? 'text-white' : 'text-text'
                }`}
              >
                {dayNumber(dayStart)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
