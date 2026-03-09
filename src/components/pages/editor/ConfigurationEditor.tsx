import { useState, useRef, useEffect, useCallback } from 'react'
import { Route } from '@/routes/_authed/editor.$kioskId'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { useKioskEditor } from '@/components/features/kiosk-editor/use-kiosk-editor'
import { KioskEditorProvider, useKioskEditorContext } from '@/components/features/kiosk-editor/KioskEditorContext'
import { KioskCanvas } from '@/components/features/kiosk-editor/KioskCanvas'
import { KioskComponentBank } from '@/components/features/kiosk-editor/KioskComponentBank'
import { KioskLayerList } from '@/components/features/kiosk-editor/KioskLayerList'
import { KioskInspector } from '@/components/features/kiosk-editor/KioskInspector'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Delete02Icon,
  ArrowLeft02Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { Link } from '@tanstack/react-router'

export function ConfigurationEditor() {
  const { editorState } = Route.useLoaderData()
  const editor = useKioskEditor(editorState)

  return (
    <TooltipProvider>
      <KioskEditorProvider editor={editor}>
        <EditorShell />
      </KioskEditorProvider>
    </TooltipProvider>
  )
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return (el as HTMLElement).isContentEditable
}

function EditorShell() {
  const editor = useKioskEditorContext()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditableElement(document.activeElement)) return

      if (e.key === 'Escape') {
        editor.selectComponent(null)
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && editor.state.selectedComponentId) {
        e.preventDefault()
        editor.deleteComponent(editor.state.selectedComponentId)
      }
    },
    [editor],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex h-svh flex-col bg-background">
      <Header />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <main className="relative min-w-0 flex-1 overflow-hidden bg-muted/40">
          <KioskCanvas />
        </main>
        <RightSidebar />
      </div>
    </div>
  )
}

function Header() {
  const editor = useKioskEditorContext()
  const { state, configuration } = editor

  return (
    <header className="flex shrink-0 items-center border-b border-border bg-background">
      {/* Left: navigation + config info */}
      <div className="flex items-center gap-2 border-r border-border px-3 py-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                to="/management/configurations"
                className="flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              />
            }
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to configurations</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{configuration.name}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {state.versionLabel}
          </span>
          {state.draftRevision !== null && (
            <span className="text-[10px] text-muted-foreground">
              rev {state.draftRevision}
            </span>
          )}
          {state.persisting && <Spinner className="size-3" />}
        </div>
      </div>

      {/* Center: page tabs */}
      <PageTabs />

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-1 border-l border-border px-3 py-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={editor.undo}
                disabled={state.undoing}
              />
            }
          >
            {state.undoing ? (
              <Spinner className="size-3.5" />
            ) : (
              <HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-3.5" strokeWidth={2} />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={editor.redo}
                disabled={state.redoStack.length === 0}
              />
            }
          >
            <HugeiconsIcon icon={ArrowTurnForwardIcon} className="size-3.5" strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent side="bottom">Redo</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="mx-1 !h-4" />
        <Button size="sm" onClick={editor.save} disabled={state.saving}>
          {state.saving ? (
            <Spinner className="size-3" />
          ) : (
            <>
              <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" className="size-3" strokeWidth={2.5} />
              Save
            </>
          )}
        </Button>
      </div>
    </header>
  )
}

function PageTab({
  page,
  isActive,
  canDelete,
}: {
  page: { id: string; name: string }
  isActive: boolean
  canDelete: boolean
}) {
  const editor = useKioskEditorContext()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(page.name)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        renameInputRef.current?.focus()
        renameInputRef.current?.select()
      })
    }
  }, [editing])

  const commitRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== page.name) {
      editor.renamePage(page.id, trimmed)
    } else {
      setEditValue(page.name)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={renameInputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitRename()
          if (e.key === 'Escape') {
            setEditValue(page.name)
            setEditing(false)
          }
        }}
        className="h-6 w-24 rounded-md border border-border bg-background px-2 text-xs font-medium outline-none focus:ring-1 focus:ring-ring"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => editor.selectPage(page.id)}
      onDoubleClick={() => {
        setEditValue(page.name)
        setEditing(true)
      }}
      className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {page.name}
      {canDelete && isActive && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            editor.deletePage(page.id)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation()
              editor.deletePage(page.id)
            }
          }}
          className="ml-0.5 flex items-center rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-3" strokeWidth={2} />
        </span>
      )}
    </button>
  )
}

function PageTabs() {
  const editor = useKioskEditorContext()
  const { state } = editor
  const [addOpen, setAddOpen] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addOpen) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [addOpen])

  const handleAddPage = () => {
    const name = newPageName.trim()
    if (!name) return
    editor.addPage(name)
    setNewPageName('')
    setAddOpen(false)
  }

  return (
    <div className="flex flex-1 items-center gap-1 overflow-x-auto px-3 py-2">
      {state.content.pages.map((page) => (
        <PageTab
          key={page.id}
          page={page}
          isActive={page.id === state.selectedPageId}
          canDelete={state.content.pages.length > 1}
        />
      ))}

      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button variant="ghost" size="icon-xs" className="ml-0.5 text-muted-foreground" />
                }
              />
            }
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent side="bottom">Add page</TooltipContent>
        </Tooltip>
        <PopoverContent side="bottom" align="start" className="w-56">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAddPage()
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs font-medium">New page name</label>
            <div className="flex gap-1.5">
              <Input
                ref={inputRef}
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g. Welcome"
                className="flex-1"
              />
              <Button size="sm" type="submit" disabled={!newPageName.trim()}>
                Add
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function LeftSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-background">
      <section className="flex flex-col gap-2 border-b border-border p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Components
        </h2>
        <KioskComponentBank />
      </section>
      <section className="flex flex-1 flex-col gap-2 overflow-auto p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Layers
        </h2>
        <KioskLayerList />
      </section>
    </aside>
  )
}

function RightSidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-border bg-background">
      <section className="flex flex-1 flex-col overflow-auto border-b border-border">
        <h2 className="p-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Properties
        </h2>
        <KioskInspector />
      </section>
      <section className="flex flex-col gap-2 p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          File bank
        </h2>
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">
          Coming soon
        </div>
      </section>
    </aside>
  )
}
