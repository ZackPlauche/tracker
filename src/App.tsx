import { Suspense, lazy, useState } from 'react'
import { SideMenu } from './components/SideMenu'
import { BottomTabs } from './components/BottomTabs'
import { CountView } from './components/CountView'
import { SheetView } from './components/SheetView'
import { useStore } from './hooks/useStore'
import type { ChartPeriod, ViewTab } from './types'

const ChartsView = lazy(() =>
  import('./components/ChartsView').then((m) => ({ default: m.ChartsView })),
)

export default function App() {
  const store = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<ViewTab>('count')
  const [period, setPeriod] = useState<ChartPeriod>('7d')

  const { activeFunnel, data } = store

  return (
    <div className="flex h-full min-h-dvh flex-col bg-surface text-text safe-top safe-left safe-right">
      <header className="flex shrink-0 items-center gap-3 border-b border-border-subtle bg-surface-raised/80 px-3 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="tap-feedback flex h-11 w-11 items-center justify-center rounded-xl bg-surface-card text-text hover:bg-surface-hover"
          aria-label="Open menu"
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
      </header>

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        funnels={data.funnels}
        activeFunnelId={activeFunnel?.id ?? null}
        onSelect={store.setActiveFunnel}
        onCreate={store.createFunnel}
        onRename={store.renameFunnel}
        onDelete={store.deleteFunnel}
      />

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
                  onIncrement={store.increment}
                  onDecrement={store.decrement}
                  onUndo={store.undoLast}
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
  )
}
