import { createFileRoute } from '@tanstack/react-router'
import { CmsPage } from '@/components/pages/cms'

export const Route = createFileRoute('/_authed/cms')({
  component: CmsPage,
})
