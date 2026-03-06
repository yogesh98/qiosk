import { Button } from '@/components/ui/button'
import { componentTypes } from './kiosk-component-registry'
import type { KioskEditor } from './use-kiosk-editor'

export function KioskComponentBank({ editor }: { editor: KioskEditor }) {
  return (
    <div className="flex flex-col gap-1.5">
      {componentTypes.map((entry) => (
        <Button
          key={entry.type}
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={() => editor.addComponent(entry.type)}
        >
          {entry.label}
        </Button>
      ))}
    </div>
  )
}
