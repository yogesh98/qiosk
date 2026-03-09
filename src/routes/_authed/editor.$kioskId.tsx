import { createFileRoute } from '@tanstack/react-router'
import { ConfigurationEditor } from '@/components/pages/editor/ConfigurationEditor'
import { getKioskConfigurationEditorStateFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import type { KioskConfigurationEditorState } from '@/utils/kiosk-configurations/kiosk-configurations.server'

export const Route = createFileRoute('/_authed/editor/$kioskId')({
  loader: async ({ params }) => ({
    editorState: (await getKioskConfigurationEditorStateFn({
      data: { id: params.kioskId },
    })) as KioskConfigurationEditorState,
  }),
  component: ConfigurationEditor,
})
