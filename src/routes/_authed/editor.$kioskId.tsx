import { createFileRoute } from '@tanstack/react-router'
import { ConfigurationEditor } from '@/components/pages/editor/ConfigurationEditor'

export const Route = createFileRoute('/_authed/editor/$kioskId')({
  component: ConfigurationEditor,
})
