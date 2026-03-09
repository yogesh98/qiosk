import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ConfigurationEditor } from '@/components/pages/editor/ConfigurationEditor'
import { getKioskConfigurationEditorStateFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'

export const Route = createFileRoute('/_authed/editor/$kioskId')({
  validateSearch: z.object({
    sourceVersionId: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({
    sourceVersionId: search.sourceVersionId,
  }),
  loader: async ({ params, deps }) => ({
    editorState: await getKioskConfigurationEditorStateFn({
      data: {
        id: params.kioskId,
        sourceVersionId: deps.sourceVersionId,
      },
    }),
  }),
  component: ConfigurationEditor,
})
