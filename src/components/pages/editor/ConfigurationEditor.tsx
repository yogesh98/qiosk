import { Route } from '@/routes/_authed/editor.$kioskId'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ConfigurationEditor() {
  const { kioskId } = Route.useParams()

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Top bar — spans canvas + right sidebar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <Input
          defaultValue={`Configuration Name / Version (${kioskId})`}
          className="max-w-xs"
          readOnly
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Undo
          </Button>
          <Button variant="outline" size="sm">
            Redo
          </Button>
          <Button size="sm">Save</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-border">
          <section className="flex flex-1 flex-col gap-2 overflow-auto border-b border-border p-3">
            <h2 className="text-xs font-medium text-muted-foreground">
              Component bank
            </h2>
            <div className="min-h-40 flex-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Drag components here
            </div>
          </section>
          <section className="flex flex-1 flex-col gap-2 overflow-auto p-3">
            <h2 className="text-xs font-medium text-muted-foreground">
              Layer view
            </h2>
            <div className="min-h-32 flex-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Hierarchical layers
            </div>
          </section>
        </aside>

        {/* Central canvas */}
        <main className="min-w-0 flex-1 overflow-auto p-4">
          <section className="flex h-full min-h-[400px] flex-col gap-2">
            <div className="flex min-h-[360px] flex-1 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted/20 p-8 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                Canvas — drop components here. Size will scale to match kiosk
                resolution.
              </p>
            </div>
          </section>
        </main>

        {/* Right sidebar */}
        <aside className="flex w-56 shrink-0 flex-col border-l border-border">
          <section className="flex flex-1 flex-col gap-2 overflow-auto border-b border-border p-3">
            <h2 className="text-xs font-medium text-muted-foreground">
              Selected component properties
            </h2>
            <div className="min-h-40 flex-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Select a component
            </div>
          </section>
          <section className="flex flex-1 flex-col gap-2 overflow-auto p-3">
            <h2 className="text-xs font-medium text-muted-foreground">
              File bank
            </h2>
            <div className="min-h-32 flex-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Images, assets, data files
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
