import { useRef, useState, useCallback, useEffect } from 'react'
import type { KioskEditor } from './use-kiosk-editor'
import { componentRegistry } from './kiosk-component-registry'
import type { KioskConfigurationContentComponent } from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'

type InteractionState =
  | { kind: 'idle' }
  | { kind: 'dragging'; componentId: string; startX: number; startY: number; origX: number; origY: number; moved: boolean }
  | { kind: 'resizing'; componentId: string; startX: number; startY: number; origW: number; origH: number; moved: boolean }

const DRAG_THRESHOLD = 3

export function KioskCanvas({ editor }: { editor: KioskEditor }) {
  const { configuration, currentPage, state } = editor
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const interactionRef = useRef<InteractionState>({ kind: 'idle' })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      const scaleX = (rect.width - 32) / configuration.width
      const scaleY = (rect.height - 32) / configuration.height
      setScale(Math.min(scaleX, scaleY, 1))
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [configuration.width, configuration.height])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, comp: KioskConfigurationContentComponent, action: 'drag' | 'resize') => {
      e.stopPropagation()
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      editor.selectComponent(comp.id)

      if (action === 'drag') {
        interactionRef.current = {
          kind: 'dragging',
          componentId: comp.id,
          startX: e.clientX,
          startY: e.clientY,
          origX: comp.layout.x,
          origY: comp.layout.y,
          moved: false,
        }
      } else {
        interactionRef.current = {
          kind: 'resizing',
          componentId: comp.id,
          startX: e.clientX,
          startY: e.clientY,
          origW: comp.layout.w,
          origH: comp.layout.h,
          moved: false,
        }
      }
    },
    [editor],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const interaction = interactionRef.current
      if (interaction.kind === 'idle') return

      const dx = (e.clientX - interaction.startX) / scale
      const dy = (e.clientY - interaction.startY) / scale

      if (!interaction.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return
      }

      interaction.moved = true

      if (interaction.kind === 'dragging') {
        const newX = Math.max(0, Math.min(configuration.width, interaction.origX + dx))
        const newY = Math.max(0, Math.min(configuration.height, interaction.origY + dy))
        editor.moveComponentLocal(interaction.componentId, newX, newY)
      } else if (interaction.kind === 'resizing') {
        editor.resizeComponentLocal(
          interaction.componentId,
          interaction.origW + dx,
          interaction.origH + dy,
        )
      }
    },
    [scale, configuration.width, configuration.height, editor],
  )

  const handlePointerUp = useCallback(() => {
    const interaction = interactionRef.current
    if (interaction.kind !== 'idle' && interaction.moved) {
      const changeType = interaction.kind === 'dragging' ? 'move' : 'resize'
      editor.persistCurrentContent(changeType)
    }
    interactionRef.current = { kind: 'idle' }
  }, [editor])

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg !== undefined) {
        editor.selectComponent(null)
      }
    },
    [editor],
  )

  const components = currentPage?.components ?? []
  const sorted = [...components].sort((a, b) => a.layout.zIndex - b.layout.zIndex)

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden p-4"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="relative border border-border bg-white shadow-sm dark:bg-zinc-900"
        style={{
          width: configuration.width * scale,
          height: configuration.height * scale,
        }}
        onPointerDown={handleCanvasPointerDown}
      >
        <div
          className="absolute inset-0 origin-top-left"
          data-canvas-bg
          style={{ transform: `scale(${scale})`, width: configuration.width, height: configuration.height }}
          onPointerDown={handleCanvasPointerDown}
        >
          {sorted.map((comp) => {
            const entry = componentRegistry[comp.type]
            if (!entry) return null
            const isSelected = comp.id === state.selectedComponentId

            return (
              <div
                key={comp.id}
                className="absolute"
                style={{
                  left: comp.layout.x,
                  top: comp.layout.y,
                  width: comp.layout.w,
                  height: comp.layout.h,
                  zIndex: comp.layout.zIndex,
                }}
              >
                <div
                  className={`h-full w-full cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
                  onPointerDown={(e) => handlePointerDown(e, comp, 'drag')}
                >
                  {entry.render(comp.props, isSelected)}
                </div>
                {isSelected && (
                  <div
                    className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-primary bg-background"
                    onPointerDown={(e) => handlePointerDown(e, comp, 'resize')}
                  />
                )}
              </div>
            )
          })}

          {components.length === 0 && (
            <div className="flex h-full w-full items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground">
                Add components from the bank
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
