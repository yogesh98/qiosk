import { createFileRoute } from '@tanstack/react-router'
import { listKioskConfigurationsFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import { KioskConfigurations } from '@/components/pages/management/KioskConfigurations'

export const Route = createFileRoute('/_authed/management/configurations')({
  loader: () => listKioskConfigurationsFn(),
  component: KioskConfigurations,
})
