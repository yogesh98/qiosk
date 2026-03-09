import { useCallback, useEffect, useRef, useState } from 'react'
import { componentRegistry } from './kiosk-component-registry'
import type {
  KioskConfigurationContent,
  KioskConfigurationContentComponent,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import type { ComponentTypeId } from './kiosk-component-registry'

export type KioskConfigurationViewerProps = {
  configuration: { width: number; height: number }
  content: KioskConfigurationContent
  currentPageId: string
  onNavigateToPage: (pageId: string) => void
}

export function KioskConfigurationViewer({
  configuration,
  content,
  currentPageId,
  onNavigateToPage,
}: KioskConfigurationViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

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

  if (content.pages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No pages</p>
      </div>
    )
  }

  const currentPage =
    content.pages.find((p) => p.id === currentPageId) ?? content.pages[0]
  const components = currentPage.components
  const sorted = [...components].sort((a, b) => a.layout.zIndex - b.layout.zIndex)

  const handleNavigate = useCallback(
    (targetPageId: string) => {
      if (content.pages.some((p) => p.id === targetPageId)) {
        onNavigateToPage(targetPageId)
      }
    },
    [content.pages, onNavigateToPage],
  )

  const canNavigate = useCallback(
    (comp: KioskConfigurationContentComponent): boolean => {
      if (comp.action?.kind !== 'navigate') return false
      if ((comp.props as { disabled?: boolean }).disabled) {
        return false
      }
      return content.pages.some((p) => p.id === comp.action!.targetPageId)
    },
    [content.pages],
  )

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden p-4"
    >
      <div
        className="relative border border-border bg-white shadow-sm dark:bg-zinc-900"
        style={{
          width: configuration.width * scale,
          height: configuration.height * scale,
        }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `scale(${scale})`,
            width: configuration.width,
            height: configuration.height,
          }}
        >
          {sorted.map((comp) => {
            const entry = componentRegistry[comp.type as ComponentTypeId]

            const isClickable = canNavigate(comp)
            const targetPage =
              comp.action?.kind === 'navigate'
                ? content.pages.find((p) => p.id === comp.action!.targetPageId)
                : null

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
                  role={isClickable ? 'button' : undefined}
                  aria-label={
                    isClickable && targetPage
                      ? `Go to ${targetPage.name}`
                      : undefined
                  }
                  className={`h-full w-full ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={
                    isClickable && comp.action?.kind === 'navigate'
                      ? () => handleNavigate(comp.action!.targetPageId)
                      : undefined
                  }
                >
                  {entry.render(comp.props as Record<string, unknown>, false)}
                </div>
              </div>
            )
          })}

          {components.length === 0 && (
            <div className="flex h-full w-full items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground">
                This page has no components
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
