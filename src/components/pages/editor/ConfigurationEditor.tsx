import { Route } from '@/routes/_authed/editor.$kioskId'

export function ConfigurationEditor() {
  const { kioskId } = Route.useParams()
  return (
    <div className="min-h-svh bg-background p-4">
      <p className="text-sm text-muted-foreground">
        Editor for kiosk: {kioskId}
      </p>
    </div>
  )
}
