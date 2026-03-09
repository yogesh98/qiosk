import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getKioskConfigurationViewerStateFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'

export const Route = createFileRoute('/viewer/$configId')({
  loader: async ({ params, location }) => {
    const viewerState = (await getKioskConfigurationViewerStateFn({
      data: { id: params.configId },
    }))

    const { currentContent } = viewerState
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const isExactConfigPath = pathSegments[pathSegments.length - 1] === params.configId
    const requestedPageId = isExactConfigPath
      ? null
      : pathSegments[pathSegments.length - 1]
    const firstPageId = currentContent.pages[0]?.id

    if (isExactConfigPath && firstPageId) {
      throw redirect({
        to: '/viewer/$configId/$pageId',
        params: { configId: params.configId, pageId: firstPageId },
      })
    }

    if (
      requestedPageId &&
      firstPageId &&
      !currentContent.pages.some((page) => page.id === requestedPageId)
    ) {
      throw redirect({
        to: '/viewer/$configId/$pageId',
        params: { configId: params.configId, pageId: firstPageId },
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
