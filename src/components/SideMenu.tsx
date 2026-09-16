import { useState } from 'react'
import type { Funnel } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  funnels: Funnel[]
  activeFunnelId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onReset?: () => void
}

export function SideMenu({
  open,
  onClose,
  funnels,
  activeFunnelId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReset,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function handleCreate() {
    if (!newName.trim()) return
    onCreate(newName)
    setNewName('')
    setCreating(false)
  }

  function startEdit(f: Funnel) {
    setEditingId(f.id)
    setEditName(f.name)
  }

  function commitEdit() {
    if (editingId && editName.trim()) {
      onRename(editingId, editName)
    }
    setEditingId(null)
  }

  function selectFunnel(id: string) {
    onSelect(id)
    // Overlay drawer on small screens only — keep docked sidebar open on desktop
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={[
          'flex shrink-0 flex-col border-r border-border bg-surface-raised',
          // Mobile: fixed slide-over drawer
          'fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] shadow-2xl transition-transform duration-200 ease-out safe-top safe-bottom safe-left',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: docked collapsible panel (pushes content, no overlay)
          'md:relative md:inset-auto md:z-auto md:h-full md:translate-x-0 md:shadow-none md:transition-[width] md:duration-200 md:ease-out',
          open ? 'md:w-72' : 'md:w-0 md:overflow-hidden md:border-r-0',
        ].join(' ')}
        role="navigation"
        aria-label="Funnels menu"
        aria-hidden={!open}
      >
        <div className="flex h-full w-[min(20rem,85vw)] flex-col md:w-72">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-text">Tracker</h1>
              <p className="text-xs text-text-dim">Your funnels</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="tap-feedback flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card text-text-muted hover:bg-surface-hover"
              aria-label="Collapse menu"
            >
              {/* X on mobile, chevron on desktop */}
              <svg
                className="md:hidden"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <svg
                className="hidden md:block"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {funnels.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-text-dim">
                No funnels yet. Create one to start tracking.
              </p>
            )}
            {funnels.map((f) => (
              <div
                key={f.id}
                className={`group flex items-center gap-1 rounded-xl ${
                  f.id === activeFunnelId
                    ? 'bg-accent/20 ring-1 ring-accent/40'
                    : 'hover:bg-surface-card'
                }`}
              >
                {editingId === f.id ? (
                  <form
                    className="flex flex-1 items-center gap-1 p-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      commitEdit()
                    }}
                  >
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitEdit}
                      className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-sm text-text outline-none ring-1 ring-accent"
                    />
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="tap-feedback min-w-0 flex-1 truncate px-3 py-3 text-left text-sm font-medium text-text"
                      onClick={() => selectFunnel(f.id)}
                    >
                      {f.name}
                      <span className="ml-2 text-xs text-text-dim">
                        {f.metrics.length} metric{f.metrics.length === 1 ? '' : 's'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="tap-feedback flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-dim hover:bg-surface-hover hover:text-text"
                      onClick={() => startEdit(f)}
                      aria-label={`Rename ${f.name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="tap-feedback flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-dim hover:bg-danger/20 hover:text-danger"
                      onClick={() => {
                        if (confirm(`Delete funnel “${f.name}”? This cannot be undone.`)) {
                          onDelete(f.id)
                        }
                      }}
                      aria-label={`Delete ${f.name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </nav>

          <div className="border-t border-border-subtle p-3">
            {creating ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreate()
                }}
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Funnel name"
                  className="w-full rounded-xl bg-surface px-3 py-3 text-sm text-text outline-none ring-1 ring-border focus:ring-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="tap-feedback flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false)
                      setNewName('')
                    }}
                    className="tap-feedback rounded-xl bg-surface-card px-4 py-2.5 text-sm text-text-muted hover:bg-surface-hover"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="tap-feedback flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Funnel
              </button>
            )}
            {onReset && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all funnels and counts on this account? This cannot be undone.')) {
                    onReset()
                  }
                }}
                className="tap-feedback mt-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
              >
                Clear all data
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
