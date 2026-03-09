import { createContext, useContext } from 'react'
import type { KioskEditor } from './use-kiosk-editor'

const KioskEditorContext = createContext<KioskEditor | null>(null)

export function KioskEditorProvider({
  editor,
  children,
}: {
  editor: KioskEditor
  children: React.ReactNode
}) {
  return (
    <KioskEditorContext.Provider value={editor}>
      {children}
    </KioskEditorContext.Provider>
  )
}

export function useKioskEditorContext(): KioskEditor {
  const ctx = useContext(KioskEditorContext)
  if (!ctx) {
    throw new Error('useKioskEditorContext must be used within KioskEditorProvider')
  }
  return ctx
}
