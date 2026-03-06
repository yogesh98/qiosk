import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { KioskEditor } from './use-kiosk-editor'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, DragDropVerticalIcon } from '@hugeicons/core-free-icons'
import { componentRegistry } from './kiosk-component-registry'

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr]
  const [removed] = result.splice(from, 1)
  result.splice(to, 0, removed)
  return result
}

export function KioskLayerList({ editor }: { editor: KioskEditor }) {
  const { currentPage, state } = editor
  const components = currentPage?.components ?? []
  const sorted = [...components].sort((a, b) => b.layout.zIndex - a.layout.zIndex)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingId) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const row = el?.closest('[data-layer-index]')
      const idx = row?.getAttribute('data-layer-index')
      setDropIndex(idx != null ? parseInt(idx, 10) : null)
    },
    [draggingId],
  )

  const handlePointerUp = useCallback(() => {
    if (draggingId && dropIndex !== null) {
      const fromIndex = sorted.findIndex((c) => c.id === draggingId)
      if (fromIndex >= 0 && fromIndex !== dropIndex) {
        const newOrder = arrayMove(
          sorted.map((c) => c.id),
          fromIndex,
          dropIndex,
        )
        editor.reorderLayers(newOrder)
      }
    }
    setDraggingId(null)
    setDropIndex(null)
  }, [draggingId, dropIndex, sorted, editor])

  useEffect(() => {
    if (!draggingId) return
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingId, handlePointerMove, handlePointerUp])

  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent, compId: string) => {
      e.stopPropagation()
      e.preventDefault()
      setDraggingId(compId)
      const idx = sorted.findIndex((c) => c.id === compId)
      setDropIndex(idx >= 0 ? idx : null)
    },
    [sorted],
  )

  if (sorted.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No layers yet
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {sorted.map((comp, i) => {
        const entry = componentRegistry[comp.type]
        const isSelected = comp.id === state.selectedComponentId
        const isDragging = comp.id === draggingId
        const showDropAbove = dropIndex === i && !isDragging
        const label =
          comp.type === 'button'
            ? (comp.props as { text?: string }).text || 'Button'
            : entry?.label ?? comp.type

        return (
          <div
            key={comp.id}
            data-layer-id={comp.id}
            data-layer-index={i}
            className={`group flex items-center gap-1 rounded text-xs ${
              showDropAbove ? 'border-t-2 border-primary pt-0.5 -mt-0.5' : ''
            }`}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={`Drag to reorder ${label}`}
              className={`flex shrink-0 cursor-grab touch-none p-1 rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                isDragging ? 'cursor-grabbing opacity-50' : ''
              }`}
              onPointerDown={(e) => handleHandlePointerDown(e, comp.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setDraggingId(comp.id)
                  setDropIndex(i)
                }
              }}
            >
              <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" strokeWidth={2} />
            </div>
            <div
              className={`flex flex-1 min-w-0 items-center gap-1.5 rounded px-1.5 py-1 cursor-pointer ${
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-foreground'
              } ${isDragging ? 'opacity-60' : ''}`}
              onClick={() => editor.selectComponent(comp.id)}
            >
              <span className="truncate flex-1">{label}</span>
              <span className="text-[10px] shrink-0 text-muted-foreground">
                z{comp.layout.zIndex}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  editor.deleteComponent(comp.id)
                }}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
