import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { DndContext, closestCenter, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Folder, Funnel } from '../types'
import { DEFAULT_ACCENT, sortedFolders, sortedFunnels } from '../utils'
import { useReorderSensors } from '../hooks/useReorderSensors'
import { ColorSwatches } from './ColorSwatches'

type Props = {
  open: boolean
  onClose: () => void
  funnels: Funnel[]
  folders?: Folder[]
  activeFunnelId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onReorderFunnels: (orderedIds: string[], folderId: string | null) => void
  onMoveFunnel: (id: string, folderId: string | null) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onReorderFolders: (orderedIds: string[]) => void
  accentColor?: string
  onSetAccent: (color: string) => void
  onSetFunnelColor: (id: string, color: string | null) => void
  onReset?: () => void
}

function funnelDragId(id: string) {
  return `funnel:${id}`
}
function folderDragId(id: string) {
  return `folder:${id}`
}
function dropDragId(id: string) {
  return `drop:${id}`
}

function DragHandle({
  label,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className="flex h-10 w-8 shrink-0 touch-none items-center justify-center rounded-lg text-text-dim active:bg-surface-hover active:text-text"
      {...props}
      aria-label={label}
      style={{ ...props.style, touchAction: 'none' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    </button>
  )
}

function DropHint({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`mx-1 my-1 rounded-lg border border-dashed px-2 py-3 text-center text-[11px] ${
        isOver ? 'border-accent bg-accent/10 text-text' : 'border-border text-text-dim'
      }`}
    >
      {label}
    </div>
  )
}

function SortableFunnelRow({
  funnel,
  selected,
  globalColor,
  editing,
  editName,
  onEditName,
  onCommitEdit,
  menuOpen,
  colorOpen,
  moveTargets,
  onToggleMenu,
  onToggleColor,
  onSelect,
  onStartEdit,
  onArchive,
  onDelete,
  onMove,
  onSetColor,
}: {
  funnel: Funnel
  selected: boolean
  globalColor: string
  editing: boolean
  editName: string
  onEditName: (value: string) => void
  onCommitEdit: () => void
  menuOpen: boolean
  colorOpen: boolean
  moveTargets: { id: string | null; name: string }[]
  onToggleMenu: () => void
  onToggleColor: () => void
  onSelect: () => void
  onStartEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onMove: (folderId: string | null) => void
  onSetColor: (color: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: funnelDragId(funnel.id),
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl ${
        selected ? 'bg-accent/20 ring-1 ring-accent/40' : 'hover:bg-surface-card'
      } ${isDragging ? 'opacity-90 shadow-lg ring-1 ring-accent' : ''}`}
    >
      {editing ? (
        <form
          className="flex items-center gap-1 p-1"
          onSubmit={(e) => {
            e.preventDefault()
            onCommitEdit()
          }}
        >
          <input
            autoFocus
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            onBlur={onCommitEdit}
            className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-sm text-text outline-none ring-1 ring-accent"
          />
        </form>
      ) : (
        <div className="flex items-center gap-0.5 pr-1">
          <DragHandle label={`Reorder ${funnel.name}`} {...attributes} {...listeners} />
          <button
            type="button"
            className="h-6 w-6 shrink-0 rounded-full ring-1 ring-white/25"
            style={{ backgroundColor: funnel.color || globalColor }}
            aria-label={`Color for ${funnel.name}`}
            aria-expanded={colorOpen}
            onClick={onToggleColor}
          />
          <button
            type="button"
            className="min-w-0 flex-1 truncate px-2 py-3 text-left text-sm font-medium text-text"
            onClick={onSelect}
          >
            {funnel.name}
            <span className="ml-1.5 text-xs font-normal text-text-dim">
              {funnel.metrics.length}
            </span>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-dim hover:bg-surface-hover hover:text-text"
            aria-label={`Actions for ${funnel.name}`}
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
        </div>
      )}
      {colorOpen && !editing && (
        <div className="px-2 pb-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
            This funnel
          </p>
          <ColorSwatches
            value={funnel.color}
            onPick={(color) => onSetColor(color)}
            onClear={() => onSetColor(null)}
          />
        </div>
      )}
      {menuOpen && !editing && (
        <div className="space-y-1 px-2 pb-2">
          {moveTargets.length > 0 && (
            <div className="rounded-lg bg-surface p-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
                Move to
              </p>
              {moveTargets.map((target) => (
                <button
                  key={target.id ?? 'root'}
                  type="button"
                  className="block w-full truncate rounded-md px-2 py-2 text-left text-sm text-text hover:bg-surface-hover"
                  onClick={() => onMove(target.id)}
                >
                  {target.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-2 text-left text-sm text-text hover:bg-surface-hover"
            onClick={onStartEdit}
          >
            Rename
          </button>
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-2 text-left text-sm text-text hover:bg-surface-hover"
            onClick={onArchive}
          >
            Archive
          </button>
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-2 text-left text-sm text-danger hover:bg-danger/10"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function FolderBlock({
  folder,
  open,
  count,
  editing,
  editName,
  menuOpen,
  onToggle,
  onToggleMenu,
  onEditName,
  onCommitEdit,
  onStartEdit,
  onDelete,
  children,
}: {
  folder: Folder
  open: boolean
  count: number
  editing: boolean
  editName: string
  menuOpen: boolean
  onToggle: () => void
  onToggleMenu: () => void
  onEditName: (value: string) => void
  onCommitEdit: () => void
  onStartEdit: () => void
  onDelete: () => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folderDragId(folder.id),
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative' as const,
  }

  return (
    <div className="mt-2">
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-xl ${isDragging ? 'bg-surface-card opacity-90 shadow-lg' : ''}`}
      >
        <div className="flex items-center gap-0.5 pr-1">
          <DragHandle label={`Reorder folder ${folder.name}`} {...attributes} {...listeners} />
          {editing ? (
            <form
              className="min-w-0 flex-1 py-1"
              onSubmit={(e) => {
                e.preventDefault()
                onCommitEdit()
              }}
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => onEditName(e.target.value)}
                onBlur={onCommitEdit}
                className="w-full rounded-lg bg-surface px-2 py-2 text-sm text-text outline-none ring-1 ring-accent"
              />
            </form>
          ) : (
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 py-2.5 text-left"
              onClick={onToggle}
              aria-expanded={open}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 text-text-dim ${open ? 'rotate-90' : ''}`}
                aria-hidden
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
              <span className="truncate text-sm font-semibold text-text">{folder.name}</span>
              <span className="text-xs text-text-dim">{count}</span>
            </button>
          )}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-dim hover:bg-surface-hover hover:text-text"
            aria-label={`Actions for folder ${folder.name}`}
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
        </div>
        {menuOpen && !editing && (
          <div className="space-y-1 px-2 pb-2">
            <button
              type="button"
              className="block w-full rounded-lg px-2 py-2 text-left text-sm text-text hover:bg-surface-hover"
              onClick={onStartEdit}
            >
              Rename
            </button>
            <button
              type="button"
              className="block w-full rounded-lg px-2 py-2 text-left text-sm text-danger hover:bg-danger/10"
              onClick={onDelete}
            >
              Delete folder
            </button>
          </div>
        )}
      </div>
      {open && <div className="ml-3 border-l border-border-subtle pl-1">{children}</div>}
    </div>
  )
}

export function SideMenu({
  open,
  onClose,
  funnels,
  folders = [],
  activeFunnelId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onArchive,
  onRestore,
  onReorderFunnels,
  onMoveFunnel,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onReorderFolders,
  accentColor,
  onSetAccent,
  onSetFunnelColor,
  onReset,
}: Props) {
  const [creating, setCreating] = useState<'funnel' | 'folder' | null>(null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [colorFunnelId, setColorFunnelId] = useState<string | null>(null)
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const sensors = useReorderSensors()
  const globalColor = accentColor || DEFAULT_ACCENT

  const folderList = sortedFolders(folders)
  const validFolderIds = new Set(folderList.map((folder) => folder.id))

  function groupOf(funnel: Funnel): string | null {
    return funnel.folderId && validFolderIds.has(funnel.folderId) ? funnel.folderId : null
  }

  function idsIn(folderId: string | null): string[] {
    return sortedFunnels(
      funnels.filter((funnel) => !funnel.archived && groupOf(funnel) === folderId),
    ).map((funnel) => funnel.id)
  }

  const ungrouped = sortedFunnels(funnels.filter((funnel) => !funnel.archived && groupOf(funnel) === null))
  const archived = funnels.filter((funnel) => funnel.archived)

  function expandFolder(id: string) {
    setCollapsed((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function toggleFolder(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCreate() {
    const name = newName.trim()
    if (!name || !creating) return
    if (creating === 'folder') onCreateFolder(name)
    else onCreate(name)
    setNewName('')
    setCreating(null)
  }

  function commitFunnelEdit() {
    if (editingId && editName.trim()) onRename(editingId, editName)
    setEditingId(null)
  }

  function commitFolderEdit() {
    if (editingFolderId && editName.trim()) onRenameFolder(editingFolderId, editName)
    setEditingFolderId(null)
  }

  function selectFunnel(id: string) {
    onSelect(id)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      onClose()
    }
  }

  function moveTargetsFor(funnel: Funnel) {
    const current = groupOf(funnel)
    const targets: { id: string | null; name: string }[] = []
    if (current) targets.push({ id: null, name: 'Top level' })
    for (const folder of folderList) {
      if (folder.id !== current) targets.push({ id: folder.id, name: folder.name })
    }
    return targets
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith('folder:')) {
      if (!overId.startsWith('folder:')) return
      const ids = folderList.map((folder) => folder.id)
      const oldIndex = ids.indexOf(activeId.slice('folder:'.length))
      const newIndex = ids.indexOf(overId.slice('folder:'.length))
      if (oldIndex < 0 || newIndex < 0) return
      onReorderFolders(arrayMove(ids, oldIndex, newIndex))
      return
    }

    if (!activeId.startsWith('funnel:')) return
    const funnelId = activeId.slice('funnel:'.length)
    const dragged = funnels.find((funnel) => funnel.id === funnelId)
    if (!dragged) return
    const from = groupOf(dragged)

    if (overId.startsWith('funnel:')) {
      const overFunnelId = overId.slice('funnel:'.length)
      const overFunnel = funnels.find((funnel) => funnel.id === overFunnelId)
      const to = overFunnel ? groupOf(overFunnel) : null
      if (from === to) {
        const ids = idsIn(from)
        const oldIndex = ids.indexOf(funnelId)
        const newIndex = ids.indexOf(overFunnelId)
        if (oldIndex < 0 || newIndex < 0) return
        onReorderFunnels(arrayMove(ids, oldIndex, newIndex), from)
        return
      }
      const destIds = idsIn(to).filter((id) => id !== funnelId)
      const newIndex = destIds.indexOf(overFunnelId)
      destIds.splice(newIndex < 0 ? destIds.length : newIndex, 0, funnelId)
      onReorderFunnels(destIds, to)
      if (to) expandFolder(to)
      return
    }

    let to: string | null = null
    if (overId.startsWith('folder:')) to = overId.slice('folder:'.length)
    else if (overId === dropDragId('root')) to = null
    else if (overId.startsWith('drop:')) to = overId.slice('drop:'.length)
    else return

    const destIds = idsIn(to).filter((id) => id !== funnelId)
    destIds.push(funnelId)
    onReorderFunnels(destIds, to)
    if (to) expandFolder(to)
  }

  function renderFunnel(funnel: Funnel) {
    return (
      <SortableFunnelRow
        key={funnel.id}
        funnel={funnel}
        selected={funnel.id === activeFunnelId}
        globalColor={globalColor}
        editing={editingId === funnel.id}
        editName={editName}
        onEditName={setEditName}
        onCommitEdit={commitFunnelEdit}
        menuOpen={menuKey === `funnel:${funnel.id}`}
        colorOpen={colorFunnelId === funnel.id}
        moveTargets={moveTargetsFor(funnel)}
        onToggleMenu={() => {
          setColorFunnelId(null)
          setMenuKey((key) => (key === `funnel:${funnel.id}` ? null : `funnel:${funnel.id}`))
        }}
        onToggleColor={() => {
          setMenuKey(null)
          setColorFunnelId((id) => (id === funnel.id ? null : funnel.id))
        }}
        onSelect={() => selectFunnel(funnel.id)}
        onStartEdit={() => {
          setMenuKey(null)
          setEditingFolderId(null)
          setEditingId(funnel.id)
          setEditName(funnel.name)
        }}
        onArchive={() => {
          setMenuKey(null)
          onArchive(funnel.id)
        }}
        onDelete={() => {
          if (confirm(`Delete funnel “${funnel.name}”? This cannot be undone.`)) {
            setMenuKey(null)
            onDelete(funnel.id)
          }
        }}
        onMove={(folderId) => {
          setMenuKey(null)
          onMoveFunnel(funnel.id, folderId)
          if (folderId) expandFolder(folderId)
        }}
        onSetColor={(color) => {
          onSetFunnelColor(funnel.id, color)
          setColorFunnelId(null)
        }}
      />
    )
  }

  return (
    <>
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
          'fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] shadow-2xl transition-transform duration-200 ease-out safe-top safe-bottom safe-left',
          open ? 'translate-x-0' : '-translate-x-full',
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
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card text-text-muted hover:bg-surface-hover"
              aria-label="Collapse menu"
            >
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
            {ungrouped.length === 0 && folderList.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-text-dim">
                {archived.length > 0
                  ? 'No active funnels. Restore one from the archive, or create a new one.'
                  : 'No funnels yet. Create one to start tracking.'}
              </p>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={ungrouped.map((funnel) => funnelDragId(funnel.id))}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {ungrouped.map((funnel) => renderFunnel(funnel))}
                  {ungrouped.length === 0 && folderList.length > 0 && (
                    <DropHint id={dropDragId('root')} label="Drop here for no folder" />
                  )}
                </div>
              </SortableContext>

              <SortableContext
                items={folderList.map((folder) => folderDragId(folder.id))}
                strategy={verticalListSortingStrategy}
              >
                {folderList.map((folder) => {
                  const members = sortedFunnels(
                    funnels.filter((funnel) => !funnel.archived && groupOf(funnel) === folder.id),
                  )
                  const isOpen = !collapsed.has(folder.id)
                  return (
                    <FolderBlock
                      key={folder.id}
                      folder={folder}
                      open={isOpen}
                      count={members.length}
                      editing={editingFolderId === folder.id}
                      editName={editName}
                      menuOpen={menuKey === `folder:${folder.id}`}
                      onToggle={() => toggleFolder(folder.id)}
                      onToggleMenu={() =>
                        setMenuKey((key) => (key === `folder:${folder.id}` ? null : `folder:${folder.id}`))
                      }
                      onEditName={setEditName}
                      onCommitEdit={commitFolderEdit}
                      onStartEdit={() => {
                        setMenuKey(null)
                        setEditingId(null)
                        setEditingFolderId(folder.id)
                        setEditName(folder.name)
                      }}
                      onDelete={() => {
                        if (
                          confirm(
                            `Remove folder “${folder.name}”? Funnels inside stay and move to the top level.`,
                          )
                        ) {
                          setMenuKey(null)
                          onDeleteFolder(folder.id)
                        }
                      }}
                    >
                      <SortableContext
                        items={members.map((funnel) => funnelDragId(funnel.id))}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1 py-1">
                          {members.map((funnel) => renderFunnel(funnel))}
                          {members.length === 0 && (
                            <DropHint id={dropDragId(folder.id)} label="Empty — drop a funnel" />
                          )}
                        </div>
                      </SortableContext>
                    </FolderBlock>
                  )
                })}
              </SortableContext>
            </DndContext>

            {archived.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setArchiveOpen((value) => !value)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-dim hover:bg-surface-card hover:text-text"
                  aria-expanded={archiveOpen}
                >
                  <span>Archive ({archived.length})</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={archiveOpen ? 'rotate-180' : ''}
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {archiveOpen && (
                  <div className="mt-1 space-y-1">
                    {archived.map((funnel) => (
                      <div
                        key={funnel.id}
                        className="flex items-center gap-1 rounded-xl hover:bg-surface-card"
                      >
                        <button
                          type="button"
                          className={`min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm ${
                            funnel.id === activeFunnelId ? 'font-semibold text-text' : 'text-text-muted'
                          }`}
                          onClick={() => onSelect(funnel.id)}
                        >
                          {funnel.name}
                        </button>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
                          onClick={() => {
                            onRestore(funnel.id)
                            if (funnel.folderId) expandFolder(funnel.folderId)
                            setArchiveOpen(false)
                          }}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-dim hover:bg-danger/20 hover:text-danger"
                          onClick={() => {
                            if (confirm(`Delete funnel “${funnel.name}”? This cannot be undone.`)) {
                              onDelete(funnel.id)
                            }
                          }}
                          aria-label={`Delete ${funnel.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                  placeholder={creating === 'folder' ? 'Folder name' : 'Funnel name'}
                  className="w-full rounded-xl bg-surface px-3 py-3 text-sm text-text outline-none ring-1 ring-border focus:ring-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(null)
                      setNewName('')
                    }}
                    className="rounded-xl bg-surface-card px-4 py-2.5 text-sm text-text-muted hover:bg-surface-hover"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCreating('funnel')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New funnel
                </button>
                <button
                  type="button"
                  onClick={() => setCreating('folder')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-card py-2.5 text-sm font-semibold text-text hover:bg-surface-hover"
                >
                  New folder
                </button>
              </div>
            )}
            <div className="mb-1 mt-3">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
                Default color
              </p>
              <ColorSwatches value={globalColor} onPick={onSetAccent} />
            </div>
            {onReset && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all funnels and counts on this account? This cannot be undone.')) {
                    onReset()
                  }
                }}
                className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
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
