import { componentTypes } from './kiosk-component-registry'
import { useKioskEditorContext } from './KioskEditorContext'
import { Button } from '@/components/ui/button'

export function KioskComponentBank() {
  const editor = useKioskEditorContext()

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
