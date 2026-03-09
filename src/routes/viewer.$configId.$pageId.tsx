import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { KioskConfigurationViewer } from '@/components/features/kiosk-editor/KioskConfigurationViewer'

const parentRoute = getRouteApi('/viewer/$configId')

export const Route = createFileRoute('/viewer/$configId/$pageId')({
  component: ViewerPage,
})

function ViewerPage() {
  const { viewerState } = parentRoute.useLoaderData()
  const search = parentRoute.useSearch()
  const { configId, pageId } = Route.useParams()
  const navigate = useNavigate()

  const { configuration, currentContent } = viewerState

  const handleNavigateToPage = (targetPageId: string) => {
    navigate({
      to: '/viewer/$configId/$pageId',
      params: { configId, pageId: targetPageId },
      search,
    })
  }

  return (
    <div className="h-svh w-full">
      <KioskConfigurationViewer
        configuration={{ width: configuration.width, height: configuration.height }}
        content={currentContent}
        currentPageId={pageId}
        onNavigateToPage={handleNavigateToPage}
      />
    </div>
  )
}
