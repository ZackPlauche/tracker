import { Icon } from '@iconify/react'
import type { User } from 'firebase/auth'

type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

type Props = {
  user: User | null
  loading: boolean
  configured: boolean
  syncStatus: SyncStatus
  error: string | null
  onSignIn: () => void
  onSignOut: () => void
}

export function AuthBar({
  user,
  loading,
  configured,
  syncStatus,
  error,
  onSignIn,
  onSignOut,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-dim">
        <Icon icon="svg-spinners:ring-resize" className="h-4 w-4" />
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {syncStatus === 'syncing' && (
          <span className="hidden text-[10px] text-text-dim sm:inline">Syncing…</span>
        )}
        {syncStatus === 'error' && (
          <span className="hidden text-[10px] text-danger sm:inline">Sync error</span>
        )}
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
            {(user.email ?? '?')[0]?.toUpperCase()}
          </div>
        )}
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-xs font-medium text-text">{user.email}</p>
          <p className="text-[10px] text-text-dim">
            {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing…' : 'Cloud'}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="tap-feedback shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onSignIn}
        disabled={!configured}
        className="tap-feedback flex items-center gap-1.5 rounded-xl bg-surface-card px-3 py-2 text-xs font-semibold text-text ring-1 ring-border hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        title={configured ? 'Sign in to sync across devices' : 'Add VITE_FIREBASE_* env vars — see README'}
      >
        <Icon icon="flat-color-icons:google" className="h-4 w-4" />
        <span className="hidden xs:inline sm:inline">Sign in to sync</span>
        <span className="sm:hidden">Sync</span>
      </button>
      {!configured && (
        <p className="max-w-[10rem] text-right text-[10px] leading-tight text-text-dim">
          Firebase not configured
        </p>
      )}
      {error && (
        <p className="max-w-[12rem] text-right text-[10px] leading-tight text-danger">{error}</p>
      )}
    </div>
  )
}
