import { useState, useCallback, useRef } from 'react'
import type {
  KioskConfigurationContent,
  KioskConfigurationContentComponent,
  KioskConfigurationContentPage,
  ButtonProps,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import {
  createDefaultPage,
  generateId,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import type { KioskConfigurationEditorState } from '@/utils/kiosk-configurations/kiosk-configurations.server'
import {
  appendKioskConfigurationContentEditFn,
  undoKioskConfigurationContentEditFn,
  saveKioskConfigurationContentVersionFn,
} from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import { componentRegistry } from './kiosk-component-registry'
import type { ComponentTypeId } from './kiosk-component-registry'
import { toast } from 'sonner'

export type KioskEditorState = {
  content: KioskConfigurationContent
  selectedPageId: string | null
  selectedComponentId: string | null
  saving: boolean
  undoing: boolean
  persisting: boolean
  redoStack: KioskConfigurationContent[]
  versionLabel: string
  draftRevision: number | null
}

function ensureAtLeastOnePage(content: KioskConfigurationContent): {
  content: KioskConfigurationContent
  selectedPageId: string
} {
  if (content.pages.length > 0) {
    return { content, selectedPageId: content.pages[0].id }
  }
  const page = createDefaultPage()
  return {
    content: { ...content, pages: [page] },
    selectedPageId: page.id,
  }
}

export function useKioskEditor(editorState: KioskConfigurationEditorState) {
  const { configuration, latestEdit, latestVersion } = editorState
  const initial = ensureAtLeastOnePage(editorState.currentContent)

  const [state, setState] = useState<KioskEditorState>({
    content: initial.content,
    selectedPageId: initial.selectedPageId,
    selectedComponentId: null,
    saving: false,
    undoing: false,
    persisting: false,
    redoStack: [],
    versionLabel: latestVersion ? `v${latestVersion.version}` : 'Unsaved',
    draftRevision: latestEdit?.revision ?? null,
  })

  const persistingRef = useRef(false)

  const currentPage = state.content.pages.find(
    (p) => p.id === state.selectedPageId,
  )

  const selectedComponent = currentPage?.components.find(
    (c) => c.id === state.selectedComponentId,
  )

  const persistEdit = useCallback(
    async (content: KioskConfigurationContent, changeType: string) => {
      if (persistingRef.current) return
      persistingRef.current = true
      setState((s) => ({ ...s, persisting: true }))
      try {
        const result = await appendKioskConfigurationContentEditFn({
          data: { id: configuration.id, changeType, content },
        })
        const resolved = result as { latestEdit?: { revision: number } | null }
        setState((s) => ({
          ...s,
          draftRevision: resolved.latestEdit?.revision ?? s.draftRevision,
          persisting: false,
        }))
      } catch {
        toast.error('Failed to save edit')
        setState((s) => ({ ...s, persisting: false }))
      } finally {
        persistingRef.current = false
      }
    },
    [configuration.id],
  )

  const updateContent = useCallback(
    (
      updater: (content: KioskConfigurationContent) => KioskConfigurationContent,
      changeType: string,
    ) => {
      setState((s) => {
        const next = updater(s.content)
        persistEdit(next, changeType)
        return { ...s, content: next, redoStack: [] }
      })
    },
    [persistEdit],
  )

  const updatePage = useCallback(
    (
      updater: (page: KioskConfigurationContentPage) => KioskConfigurationContentPage,
      changeType: string,
    ) => {
      updateContent(
        (content) => ({
          ...content,
          pages: content.pages.map((p) =>
            p.id === state.selectedPageId ? updater(p) : p,
          ),
        }),
        changeType,
      )
    },
    [updateContent, state.selectedPageId],
  )

  const addComponent = useCallback(
    (type: ComponentTypeId) => {
      const entry = componentRegistry[type]
      const comp = entry.createDefault(configuration.width, configuration.height)
      const maxZ = currentPage?.components.reduce(
        (max, c) => Math.max(max, c.layout.zIndex),
        -1,
      ) ?? -1
      comp.layout.zIndex = maxZ + 1

      updatePage(
        (page) => ({ ...page, components: [...page.components, comp] }),
        `add_${type}`,
      )
      setState((s) => ({ ...s, selectedComponentId: comp.id }))
    },
    [updatePage, currentPage, configuration.width, configuration.height],
  )

  const selectComponent = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedComponentId: id }))
  }, [])

  const updateComponentProps = useCallback(
    (componentId: string, props: Partial<ButtonProps>) => {
      updatePage(
        (page) => ({
          ...page,
          components: page.components.map((c) =>
            c.id === componentId
              ? { ...c, props: { ...c.props, ...props } }
              : c,
          ),
        }),
        'update_props',
      )
    },
    [updatePage],
  )

  const updateComponentAction = useCallback(
    (
      componentId: string,
      action: KioskConfigurationContentComponent['action'],
    ) => {
      updatePage(
        (page) => ({
          ...page,
          components: page.components.map((c) =>
            c.id === componentId ? { ...c, action } : c,
          ),
        }),
        'update_action',
      )
    },
    [updatePage],
  )

  const updatePageLocal = useCallback(
    (
      updater: (page: KioskConfigurationContentPage) => KioskConfigurationContentPage,
    ) => {
      setState((s) => ({
        ...s,
        content: {
          ...s.content,
          pages: s.content.pages.map((p) =>
            p.id === s.selectedPageId ? updater(p) : p,
          ),
        },
      }))
    },
    [],
  )

  const persistCurrentContent = useCallback(
    (changeType: string) => {
      setState((s) => {
        persistEdit(s.content, changeType)
        return { ...s, redoStack: [] }
      })
    },
    [persistEdit],
  )

  const moveComponentLocal = useCallback(
    (componentId: string, x: number, y: number) => {
      updatePageLocal((page) => ({
        ...page,
        components: page.components.map((c) =>
          c.id === componentId
            ? { ...c, layout: { ...c.layout, x: Math.round(x), y: Math.round(y) } }
            : c,
        ),
      }))
    },
    [updatePageLocal],
  )

  const resizeComponentLocal = useCallback(
    (componentId: string, w: number, h: number) => {
      updatePageLocal((page) => ({
        ...page,
        components: page.components.map((c) =>
          c.id === componentId
            ? {
                ...c,
                layout: {
                  ...c.layout,
                  w: Math.max(20, Math.round(w)),
                  h: Math.max(20, Math.round(h)),
                },
              }
            : c,
        ),
      }))
    },
    [updatePageLocal],
  )

  const deleteComponent = useCallback(
    (componentId: string) => {
      updatePage(
        (page) => ({
          ...page,
          components: page.components.filter((c) => c.id !== componentId),
        }),
        'delete',
      )
      setState((s) => ({
        ...s,
        selectedComponentId:
          s.selectedComponentId === componentId ? null : s.selectedComponentId,
      }))
    },
    [updatePage],
  )

  const reorderLayers = useCallback(
    (orderedIds: string[]) => {
      if (orderedIds.length === 0) return
      updatePage(
        (page) => {
          const idToIdx = new Map(orderedIds.map((id, i) => [id, i]))
          const n = orderedIds.length
          return {
            ...page,
            components: page.components.map((c) => {
              const idx = idToIdx.get(c.id)
              if (idx === undefined) return c
              return {
                ...c,
                layout: { ...c.layout, zIndex: n - 1 - idx },
              }
            }),
          }
        },
        'reorder_layers',
      )
    },
    [updatePage],
  )

  const bringForward = useCallback(
    (componentId: string) => {
      updatePage(
        (page) => {
          const maxZ = page.components.reduce(
            (max, c) => Math.max(max, c.layout.zIndex),
            0,
          )
          return {
            ...page,
            components: page.components.map((c) =>
              c.id === componentId
                ? {
                    ...c,
                    layout: { ...c.layout, zIndex: Math.min(maxZ + 1, c.layout.zIndex + 1) },
                  }
                : c,
            ),
          }
        },
        'bring_forward',
      )
    },
    [updatePage],
  )

  const sendBackward = useCallback(
    (componentId: string) => {
      updatePage(
        (page) => ({
          ...page,
          components: page.components.map((c) =>
            c.id === componentId
              ? {
                  ...c,
                  layout: { ...c.layout, zIndex: Math.max(0, c.layout.zIndex - 1) },
                }
              : c,
          ),
        }),
        'send_backward',
      )
    },
    [updatePage],
  )

  const addPage = useCallback(
    (name: string) => {
      const page = createDefaultPage(name)
      updateContent(
        (content) => ({ ...content, pages: [...content.pages, page] }),
        'add_page',
      )
      setState((s) => ({ ...s, selectedPageId: page.id, selectedComponentId: null }))
    },
    [updateContent],
  )

  const selectPage = useCallback((pageId: string) => {
    setState((s) => ({ ...s, selectedPageId: pageId, selectedComponentId: null }))
  }, [])

  const deletePage = useCallback(
    (pageId: string) => {
      updateContent(
        (content) => {
          const filtered = content.pages.filter((p) => p.id !== pageId)
          if (filtered.length === 0) {
            filtered.push(createDefaultPage())
          }
          return { ...content, pages: filtered }
        },
        'delete_page',
      )
      setState((s) => ({
        ...s,
        selectedPageId:
          s.selectedPageId === pageId
            ? s.content.pages.find((p) => p.id !== pageId)?.id ??
              s.content.pages[0]?.id ??
              null
            : s.selectedPageId,
        selectedComponentId: null,
      }))
    },
    [updateContent],
  )

  const renamePage = useCallback(
    (pageId: string, name: string) => {
      updateContent(
        (content) => ({
          ...content,
          pages: content.pages.map((p) => (p.id === pageId ? { ...p, name } : p)),
        }),
        'rename_page',
      )
    },
    [updateContent],
  )

  const undo = useCallback(async () => {
    setState((s) => ({ ...s, undoing: true }))
    try {
      const result = await undoKioskConfigurationContentEditFn({
        data: { id: configuration.id },
      })
      const resolved = result as {
        currentContent: KioskConfigurationContent
        latestEdit?: { revision: number } | null
      }
      const withPage = ensureAtLeastOnePage(resolved.currentContent)
      setState((s) => ({
        ...s,
        content: withPage.content,
        selectedPageId: s.content.pages.find((p) => p.id === s.selectedPageId)
          ? s.selectedPageId
          : withPage.selectedPageId,
        selectedComponentId: null,
        redoStack: [s.content, ...s.redoStack],
        draftRevision: resolved.latestEdit?.revision ?? null,
        undoing: false,
      }))
    } catch {
      toast.error('Nothing to undo')
      setState((s) => ({ ...s, undoing: false }))
    }
  }, [configuration.id])

  const redo = useCallback(() => {
    setState((s) => {
      if (s.redoStack.length === 0) return s
      const [next, ...rest] = s.redoStack
      const withPage = ensureAtLeastOnePage(next)
      persistEdit(withPage.content, 'redo')
      return {
        ...s,
        content: withPage.content,
        selectedPageId: withPage.selectedPageId,
        selectedComponentId: null,
        redoStack: rest,
      }
    })
  }, [persistEdit])

  const save = useCallback(async () => {
    setState((s) => ({ ...s, saving: true }))
    try {
      const result = await saveKioskConfigurationContentVersionFn({
        data: { id: configuration.id },
      })
      const resolved = result as {
        latestVersion?: { version: number } | null
      }
      setState((s) => ({
        ...s,
        saving: false,
        versionLabel: resolved.latestVersion
          ? `v${resolved.latestVersion.version}`
          : s.versionLabel,
      }))
      toast.success('Version saved')
    } catch {
      toast.error('Failed to save version')
      setState((s) => ({ ...s, saving: false }))
    }
  }, [configuration.id])

  return {
    state,
    configuration,
    currentPage,
    selectedComponent,
    addComponent,
    selectComponent,
    updateComponentProps,
    updateComponentAction,
    moveComponentLocal,
    resizeComponentLocal,
    persistCurrentContent,
    deleteComponent,
    reorderLayers,
    bringForward,
    sendBackward,
    addPage,
    selectPage,
    deletePage,
    renamePage,
    undo,
    redo,
    save,
  }
}

export type KioskEditor = ReturnType<typeof useKioskEditor>
