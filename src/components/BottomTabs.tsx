import type { ReactNode } from 'react'
import type { ViewTab } from '../types'

type Props = {
  active: ViewTab
  onChange: (tab: ViewTab) => void
}

const tabs: { id: ViewTab; label: string; icon: ReactNode }[] = [
  {
    id: 'count',
    label: 'Count',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'charts',
    label: 'Charts',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    id: 'sheet',
    label: 'Sheet',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18" />
      </svg>
    ),
  },
]

export function BottomTabs({ active, onChange }: Props) {
  return (
    <nav className="safe-bottom border-t border-border-subtle bg-surface-raised/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1 pb-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`tap-feedback flex min-h-[3.25rem] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors ${
                isActive ? 'text-accent-hover' : 'text-text-dim hover:text-text-muted'
              }`}
            >
              <span className={isActive ? 'text-accent-hover' : ''}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
