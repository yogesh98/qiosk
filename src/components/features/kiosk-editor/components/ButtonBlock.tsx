import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'

export function ButtonBlock({
  props,
}: {
  props: ButtonProps
  selected: boolean
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      {props.text ? (
        <Button
          variant={props.variant}
          size={props.size}
          disabled={props.disabled}
          className="pointer-events-none"
          tabIndex={-1}
        >
          {props.text}
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground italic">Enter Text</span>
      )}
    </div>
  )
}
