import { createFileRoute } from '@tanstack/react-router'
import { listKioskConfigurationsFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import { KioskConfigurations } from '@/components/pages/admin/KioskConfigurations'

export const Route = createFileRoute('/_authed/admin/configurations')({
  loader: () => listKioskConfigurationsFn(),
  component: KioskConfigurations,
})
