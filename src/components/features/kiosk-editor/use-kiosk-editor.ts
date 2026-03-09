import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { componentRegistry } from './kiosk-component-registry'
import type { ComponentTypeId } from './kiosk-component-registry'
import type {
  KioskConfigurationContent,
  KioskConfigurationContentComponent,
  KioskConfigurationContentPage,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import type { KioskConfigurationEditorState } from '@/utils/kiosk-configurations/kiosk-configurations.server'
import {
  createDefaultPage,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import {
  saveKioskConfigurationAsNewVersionFn,
  saveKioskConfigurationFn,
} from '@/utils/kiosk-configurations/kiosk-configurations.functions'

const MAX_HISTORY_LENGTH = 100

export type KioskEditorState = {
  content: KioskConfigurationContent
  selectedPageId: string | null
  selectedComponentId: string | null
  saving: boolean
  savingAsNewVersion: boolean
  persisting: boolean
  hasUnsavedChanges: boolean
  currentVersionNumber: number | null
  sourceVersionId: string | null
  sourceVersionNumber: number | null
  undoStack: Array<KioskConfigurationContent>
  redoStack: Array<KioskConfigurationContent>
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

function pushHistory(
  stack: Array<KioskConfigurationContent>,
  snapshot: KioskConfigurationContent,
) {
  return [snapshot, ...stack].slice(0, MAX_HISTORY_LENGTH)
}

export function useKioskEditor(editorState: KioskConfigurationEditorState) {
  const { configuration, currentVersion, sourceVersion } = editorState
  const initial = ensureAtLeastOnePage(editorState.currentContent)

  const [state, setState] = useState<KioskEditorState>({
    content: initial.content,
    selectedPageId: initial.selectedPageId,
    selectedComponentId: null,
    saving: false,
    savingAsNewVersion: false,
    persisting: false,
    hasUnsavedChanges: false,
    currentVersionNumber: currentVersion?.version ?? null,
    sourceVersionId: sourceVersion?.id ?? null,
    sourceVersionNumber: sourceVersion?.version ?? null,
    undoStack: [],
    redoStack: [],
  })

  const selectedPageIdRef = useRef(state.selectedPageId)
  selectedPageIdRef.current = state.selectedPageId
  const transientHistoryBaseRef = useRef<KioskConfigurationContent | null>(null)

  const currentPage = useMemo(
    () => state.content.pages.find((page) => page.id === state.selectedPageId),
    [state.content.pages, state.selectedPageId],
  )

  const selectedComponent = useMemo(
    () =>
      currentPage?.components.find(
        (component) => component.id === state.selectedComponentId,
      ),
    [currentPage?.components, state.selectedComponentId],
  )

  const commitContentChange = useCallback(
    (
      updater: (content: KioskConfigurationContent) => KioskConfigurationContent,
      _changeType: string,
    ) => {
      setState((current) => {
        const nextContent = updater(current.content)

        return {
          ...current,
          content: nextContent,
          undoStack: pushHistory(current.undoStack, current.content),
          redoStack: [],
          hasUnsavedChanges: true,
        }
      })
    },
    [],
  )

  const updatePage = useCallback(
    (
      updater: (page: KioskConfigurationContentPage) => KioskConfigurationContentPage,
      changeType: string,
    ) => {
      const pageId = selectedPageIdRef.current
      commitContentChange(
        (content) => ({
          ...content,
          pages: content.pages.map((page) =>
            page.id === pageId ? updater(page) : page,
          ),
        }),
        changeType,
      )
    },
    [commitContentChange],
  )

  const updatePageLocal = useCallback(
    (
      updater: (page: KioskConfigurationContentPage) => KioskConfigurationContentPage,
    ) => {
      setState((current) => {
        if (!transientHistoryBaseRef.current) {
          transientHistoryBaseRef.current = current.content
        }

        return {
          ...current,
          content: {
            ...current.content,
            pages: current.content.pages.map((page) =>
              page.id === current.selectedPageId ? updater(page) : page,
            ),
          },
          hasUnsavedChanges: true,
        }
      })
    },
    [],
  )

  const finalizeTransientChange = useCallback(
    () => {
      setState((current) => {
        const transientBase = transientHistoryBaseRef.current
        transientHistoryBaseRef.current = null

        return {
          ...current,
          undoStack: transientBase
            ? pushHistory(current.undoStack, transientBase)
            : current.undoStack,
          redoStack: [],
          hasUnsavedChanges: true,
        }
      })
    },
    [],
  )

  const addComponent = useCallback(
    (type: ComponentTypeId) => {
      const entry = componentRegistry[type]
      const component = entry.createDefault(
        configuration.width,
        configuration.height,
      )
      const maxZIndex =
        currentPage?.components.reduce(
          (highest, item) => Math.max(highest, item.layout.zIndex),
          -1,
        ) ?? -1

      component.layout.zIndex = maxZIndex + 1

      updatePage(
        (page) => ({
          ...page,
          components: [...page.components, component],
        }),
        `add_${type}`,
      )

      setState((current) => ({
        ...current,
        selectedComponentId: component.id,
      }))
    },
    [configuration.height, configuration.width, currentPage, updatePage],
  )

  const selectComponent = useCallback((id: string | null) => {
    setState((current) => ({ ...current, selectedComponentId: id }))
  }, [])

  const updateComponentProps = useCallback(
    (componentId: string, props: Record<string, unknown>) => {
      updatePage(
        (page) => ({
          ...page,
          components: page.components.map((component) =>
            component.id === componentId
              ? {
                  ...component,
                  props: { ...component.props, ...props },
                }
              : component,
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
          components: page.components.map((component) =>
            component.id === componentId ? { ...component, action } : component,
          ),
        }),
        'update_action',
      )
    },
    [updatePage],
  )

  const moveComponentLocal = useCallback(
    (componentId: string, x: number, y: number) => {
      updatePageLocal((page) => ({
        ...page,
        components: page.components.map((component) =>
          component.id === componentId
            ? {
                ...component,
                layout: {
                  ...component.layout,
                  x: Math.round(x),
                  y: Math.round(y),
                },
              }
            : component,
        ),
      }))
    },
    [updatePageLocal],
  )

  const resizeComponentLocal = useCallback(
    (componentId: string, w: number, h: number) => {
      updatePageLocal((page) => ({
        ...page,
        components: page.components.map((component) =>
          component.id === componentId
            ? {
                ...component,
                layout: {
                  ...component.layout,
                  w: Math.max(20, Math.round(w)),
                  h: Math.max(20, Math.round(h)),
                },
              }
            : component,
        ),
      }))
    },
    [updatePageLocal],
  )

  const persistCurrentContent = useCallback(
    (_changeType: string) => {
      finalizeTransientChange()
    },
    [finalizeTransientChange],
  )

  const deleteComponent = useCallback(
    (componentId: string) => {
      updatePage(
        (page) => ({
          ...page,
          components: page.components.filter(
            (component) => component.id !== componentId,
          ),
        }),
        'delete_component',
      )

      setState((current) => ({
        ...current,
        selectedComponentId:
          current.selectedComponentId === componentId
            ? null
            : current.selectedComponentId,
      }))
    },
    [updatePage],
  )

  const reorderLayers = useCallback(
    (orderedIds: Array<string>) => {
      if (orderedIds.length === 0) return

      updatePage(
        (page) => {
          const indexById = new Map(orderedIds.map((id, index) => [id, index]))
          const total = orderedIds.length

          return {
            ...page,
            components: page.components.map((component) => {
              const index = indexById.get(component.id)
              if (index === undefined) return component

              return {
                ...component,
                layout: {
                  ...component.layout,
                  zIndex: total - 1 - index,
                },
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
          const maxZIndex = page.components.reduce(
            (highest, component) => Math.max(highest, component.layout.zIndex),
            0,
          )

          return {
            ...page,
            components: page.components.map((component) =>
              component.id === componentId
                ? {
                    ...component,
                    layout: {
                      ...component.layout,
                      zIndex: Math.min(
                        maxZIndex + 1,
                        component.layout.zIndex + 1,
                      ),
                    },
                  }
                : component,
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
          components: page.components.map((component) =>
            component.id === componentId
              ? {
                  ...component,
                  layout: {
                    ...component.layout,
                    zIndex: Math.max(0, component.layout.zIndex - 1),
                  },
                }
              : component,
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

      commitContentChange(
        (content) => ({
          ...content,
          pages: [...content.pages, page],
        }),
        'add_page',
      )

      setState((current) => ({
        ...current,
        selectedPageId: page.id,
        selectedComponentId: null,
      }))
    },
    [commitContentChange],
  )

  const selectPage = useCallback((pageId: string) => {
    setState((current) => ({
      ...current,
      selectedPageId: pageId,
      selectedComponentId: null,
    }))
  }, [])

  const deletePage = useCallback(
    (pageId: string) => {
      setState((current) => {
        const remainingPages = current.content.pages.filter(
          (page) => page.id !== pageId,
        )
        const nextPages =
          remainingPages.length > 0 ? remainingPages : [createDefaultPage()]
        const nextContent = {
          ...current.content,
          pages: nextPages,
        }

        return {
          ...current,
          content: nextContent,
          selectedPageId:
            current.selectedPageId !== pageId &&
            nextPages.some((page) => page.id === current.selectedPageId)
              ? current.selectedPageId
              : nextPages[0]?.id ?? null,
          selectedComponentId: null,
          undoStack: pushHistory(current.undoStack, current.content),
          redoStack: [],
          hasUnsavedChanges: true,
        }
      })
    },
    [],
  )

  const renamePage = useCallback(
    (pageId: string, name: string) => {
      commitContentChange(
        (content) => ({
          ...content,
          pages: content.pages.map((page) =>
            page.id === pageId ? { ...page, name } : page,
          ),
        }),
        'rename_page',
      )
    },
    [commitContentChange],
  )

  const undo = useCallback(() => {
    setState((current) => {
      if (current.undoStack.length === 0) return current

      const [previousContent, ...remainingUndo] = current.undoStack

      const currentContent = current.content
      const withPage = ensureAtLeastOnePage(previousContent)

      transientHistoryBaseRef.current = null

      return {
        ...current,
        content: withPage.content,
        selectedPageId: withPage.content.pages.find(
          (page) => page.id === current.selectedPageId,
        )
          ? current.selectedPageId
          : withPage.selectedPageId,
        selectedComponentId: null,
        undoStack: remainingUndo,
        redoStack: pushHistory(current.redoStack, currentContent),
        hasUnsavedChanges: true,
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState((current) => {
      if (current.redoStack.length === 0) return current

      const [nextContent, ...remainingRedo] = current.redoStack

      const currentContent = current.content
      const withPage = ensureAtLeastOnePage(nextContent)

      transientHistoryBaseRef.current = null

      return {
        ...current,
        content: withPage.content,
        selectedPageId: withPage.content.pages.find(
          (page) => page.id === current.selectedPageId,
        )
          ? current.selectedPageId
          : withPage.selectedPageId,
        selectedComponentId: null,
        undoStack: pushHistory(current.undoStack, currentContent),
        redoStack: remainingRedo,
        hasUnsavedChanges: true,
      }
    })
  }, [])

  const save = useCallback(async () => {
    setState((current) => ({ ...current, saving: true, persisting: true }))

    try {
      const result = await saveKioskConfigurationFn({
        data: {
          id: configuration.id,
          content: state.content,
        },
      })
      const resolved = result as { currentVersion?: { version: number } | null }
      setState((current) => ({
        ...current,
        hasUnsavedChanges: false,
        currentVersionNumber:
          resolved.currentVersion?.version ?? current.currentVersionNumber,
        sourceVersionId: null,
        sourceVersionNumber: null,
      }))
      toast.success('Configuration saved')
    } catch {
      toast.error('Failed to save configuration')
    } finally {
      setState((current) => ({
        ...current,
        saving: false,
        persisting: false,
      }))
    }
  }, [configuration.id, state.content])

  const saveAsNewVersion = useCallback(async () => {
    setState((current) => ({
      ...current,
      savingAsNewVersion: true,
      persisting: true,
    }))

    try {
      const result = await saveKioskConfigurationAsNewVersionFn({
        data: {
          id: configuration.id,
          content: state.content,
        },
      })
      const resolved = result as { currentVersion?: { version: number } | null }
      setState((current) => ({
        ...current,
        hasUnsavedChanges: false,
        currentVersionNumber:
          resolved.currentVersion?.version ?? current.currentVersionNumber,
        sourceVersionId: null,
        sourceVersionNumber: null,
      }))
      toast.success('New version created')
    } catch {
      toast.error('Failed to create new version')
    } finally {
      setState((current) => ({
        ...current,
        savingAsNewVersion: false,
        persisting: false,
      }))
    }
  }, [configuration.id, state.content])

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
    saveAsNewVersion,
  }
}

export type KioskEditor = ReturnType<typeof useKioskEditor>
