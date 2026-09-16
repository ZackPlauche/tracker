import { Suspense, lazy, useState } from 'react'
import { SideMenu } from './components/SideMenu'
import { BottomTabs } from './components/BottomTabs'
import { CountView } from './components/CountView'
import { SheetView } from './components/SheetView'
import { AuthBar } from './components/AuthBar'
import { useAuth } from './hooks/useAuth'
import { useStore } from './hooks/useStore'
import type { ChartPeriod, ViewTab } from './types'
import { startOfDay } from './utils'

const ChartsView = lazy(() =>
  import('./components/ChartsView').then((m) => ({ default: m.ChartsView })),
)

function initialMenuOpen(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(min-width: 768px)').matches
}

export default function App() {
  const auth = useAuth()
  const store = useStore(auth.user?.uid ?? null)
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen)
  const [tab, setTab] = useState<ViewTab>('count')
  const [period, setPeriod] = useState<ChartPeriod>('7d')
  const [selectedDayStart, setSelectedDayStart] = useState(() => startOfDay())

  const { activeFunnel, data } = store

  return (
    <div className="flex h-full min-h-dvh bg-surface text-text">
      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        funnels={data.funnels}
        activeFunnelId={activeFunnel?.id ?? null}
        onSelect={store.setActiveFunnel}
        onCreate={store.createFunnel}
        onRename={store.renameFunnel}
        onDelete={store.deleteFunnel}
        onReset={() => {
          void store.resetAll()
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col safe-top safe-left safe-right">
        <header className="flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-raised/80 px-3 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="tap-feedback flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-card text-text hover:bg-surface-hover"
            aria-label={menuOpen ? 'Collapse menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Tracker</p>
            <h1 className="truncate text-lg font-bold leading-tight text-text">
              {activeFunnel?.name ?? 'No funnel'}
            </h1>
          </div>
          <AuthBar
            user={auth.user}
            loading={auth.loading}
            configured={auth.configured}
            syncStatus={store.syncStatus}
            syncError={store.syncError}
            error={auth.error}
            onSignIn={() => {
              void auth.signInWithGoogle()
            }}
            onSignOut={() => {
              void auth.signOut()
            }}
          />
        </header>

        {!auth.user && auth.configured && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-accent/10 px-3 py-2 text-xs text-text-muted">
            <span>Local only — sign in to sync desktop &amp; phone.</span>
            <button
              type="button"
              onClick={() => {
                void auth.signInWithGoogle()
              }}
              className="tap-feedback shrink-0 font-semibold text-accent hover:text-accent-hover"
            >
              Sign in with Google
            </button>
          </div>
        )}

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!activeFunnel ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <h2 className="mb-2 text-xl font-bold">Welcome to Tracker</h2>
              <p className="mb-6 max-w-sm text-sm text-text-dim">
                Create a funnel to start counting conversions — dating opens, music walk-ins, anything.
              </p>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="tap-feedback rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white"
              >
                Open menu
              </button>
            </div>
          ) : (
            <>
              {tab === 'count' && (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <CountView
                    funnel={activeFunnel}
                    events={data.events}
                    selectedDayStart={selectedDayStart}
                    onSelectedDayChange={setSelectedDayStart}
                    onIncrement={(metricId) => store.increment(metricId, selectedDayStart)}
                    onDecrement={(metricId) => store.decrement(metricId, selectedDayStart)}
                    onUndo={(metricId) => store.undoLast(metricId, selectedDayStart)}
                    onSetCount={(metricId, value) =>
                      store.setDayCount(metricId, value, selectedDayStart)
                    }
                    onRenameMetric={(metricId, name) =>
                      store.renameMetric(activeFunnel.id, metricId, name)
                    }
                    onDeleteMetric={(metricId) => store.deleteMetric(activeFunnel.id, metricId)}
                    onCreateMetric={(name) => store.createMetric(activeFunnel.id, name)}
                    onReorder={(ids) => store.reorderMetrics(activeFunnel.id, ids)}
                  />
                </div>
              )}
              {tab === 'charts' && (
                <Suspense
                  fallback={
                    <div className="flex flex-1 items-center justify-center text-sm text-text-dim">
                      Loading charts…
                    </div>
                  }
                >
                  <ChartsView
                    funnel={activeFunnel}
                    events={data.events}
                    period={period}
                    onPeriodChange={setPeriod}
                  />
                </Suspense>
              )}
              {tab === 'sheet' && <SheetView funnel={activeFunnel} events={data.events} />}
            </>
          )}
        </main>

        {activeFunnel && <BottomTabs active={tab} onChange={setTab} />}
      </div>
    </div>
  )
}
