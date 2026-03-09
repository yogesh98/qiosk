import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getKioskConfigurationViewerStateFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import type { KioskConfigurationViewerState } from '@/utils/kiosk-configurations/kiosk-configurations.server'

export const Route = createFileRoute('/viewer/$configId')({
  loader: async ({ params, location }) => {
    const viewerState = (await getKioskConfigurationViewerStateFn({
      data: { id: params.configId },
    })) as KioskConfigurationViewerState

    const { currentContent } = viewerState
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const isExactConfigPath = pathSegments[pathSegments.length - 1] === params.configId

    if (isExactConfigPath && currentContent.pages.length > 0) {
      throw redirect({
        to: '/viewer/$configId/$pageId',
        params: { configId: params.configId, pageId: currentContent.pages[0].id },
      })
    }

    return { viewerState }
  },
  component: ViewerLayout,
})

function ViewerLayout() {
  const { viewerState } = Route.useLoaderData()

  if (viewerState.currentContent.pages.length === 0) {
    return (
      <div className="flex h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">No pages in this configuration</p>
      </div>
    )
  }

  return <Outlet />
}
