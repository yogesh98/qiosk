import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { getKioskConfigurationViewerStateFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'

export const Route = createFileRoute('/viewer/$configId')({
  validateSearch: z.object({
    versionId: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({
    versionId: search.versionId,
  }),
  loader: async ({ params, location, deps }) => {
    const viewerState = (await getKioskConfigurationViewerStateFn({
      data: {
        id: params.configId,
        versionId: deps.versionId,
      },
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
        search: deps,
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
        search: deps,
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
