import { ACCENT_SWATCHES } from '../utils'

type Props = {
  value?: string
  onPick: (color: string) => void
  onClear?: () => void
}

export function ColorSwatches({ value, onPick, onClear }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACCENT_SWATCHES.map((color) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onPick(color)}
            className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface-raised ${
              selected ? 'ring-white' : 'ring-transparent'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
            aria-pressed={selected}
          />
        )
      })}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="tap-feedback rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
        >
          Use global
        </button>
      )}
    </div>
  )
}
