import { createFileRoute } from '@tanstack/react-router'
import { ManagementLayout } from '@/components/pages/management/ManagementLayout'

export const Route = createFileRoute('/_authed/management')({
  component: ManagementLayout,
})
