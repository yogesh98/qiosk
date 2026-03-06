import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import type { KioskEditor } from './use-kiosk-editor'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import {
  componentRegistry,
  type ComponentTypeId,
} from './kiosk-component-registry'
import type { PropMapField } from './kiosk-inspector-prop-map'

const DEBOUNCE_MS = 400

export function KioskInspector({ editor }: { editor: KioskEditor }) {
  const { selectedComponent, state, currentPage } = editor

  if (!selectedComponent) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Select a component</p>
      </div>
    )
  }

  const entry = componentRegistry[selectedComponent.type as ComponentTypeId]
  if (!entry?.propMap) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Unknown component type
      </div>
    )
  }

  return (
    <PropMapInspector
      editor={editor}
      componentId={selectedComponent.id}
      props={selectedComponent.props ?? {}}
      action={selectedComponent.action}
      propMap={entry.propMap}
      pages={state.content.pages}
      currentPageId={currentPage?.id ?? ''}
    />
  )
}

function PropMapInspector({
  editor,
  componentId,
  props,
  action,
  propMap,
  pages,
  currentPageId,
}: {
  editor: KioskEditor
  componentId: string
  props: Record<string, unknown>
  action?: { kind: 'navigate'; targetPageId: string }
  propMap: PropMapField[]
  pages: { id: string; name: string }[]
  currentPageId: string
}) {
  const otherPages = pages.filter((p) => p.id !== currentPageId)

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Layer controls - common to all components */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.bringForward(componentId)}
          title="Bring forward"
        >
          <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.sendBackward(componentId)}
          title="Send backward"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.deleteComponent(componentId)}
          title="Delete"
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        </Button>
      </div>

      <FieldGroup>
        {propMap.map((field) => (
          <PropMapFieldRenderer
            key={field.key}
            field={field}
            editor={editor}
            componentId={componentId}
            props={props}
            action={action}
            otherPages={otherPages}
          />
        ))}
      </FieldGroup>
    </div>
  )
}

function PropMapFieldRenderer({
  field,
  editor,
  componentId,
  props,
  action,
  otherPages,
}: {
  field: PropMapField
  editor: KioskEditor
  componentId: string
  props: Record<string, unknown>
  action?: { kind: 'navigate'; targetPageId: string }
  otherPages: { id: string; name: string }[]
}) {
  if (field.inputType === 'input') {
    return (
      <DebouncedInputField
        field={field}
        editor={editor}
        componentId={componentId}
        value={(props[field.key] as string) ?? ''}
        debounce={field.debounce ?? false}
      />
    )
  }

  if (field.inputType === 'select') {
    return (
      <Field>
        <FieldLabel htmlFor={`field-${field.key}`}>{field.label}</FieldLabel>
        <NativeSelect
          id={`field-${field.key}`}
          value={(props[field.key] as string) ?? ''}
          className="w-full"
          onChange={(e) =>
            editor.updateComponentProps(componentId, {
              [field.key]: e.target.value,
            })
          }
        >
          {Object.entries(field.options).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    )
  }

  if (field.inputType === 'switch') {
    return (
      <Field orientation="horizontal">
        <FieldLabel htmlFor={`field-${field.key}`}>{field.label}</FieldLabel>
        <Switch
          id={`field-${field.key}`}
          size="sm"
          checked={(props[field.key] as boolean) ?? false}
          onCheckedChange={(checked) =>
            editor.updateComponentProps(componentId, { [field.key]: checked })
          }
        />
      </Field>
    )
  }

  if (field.inputType === 'pageSelect') {
    return (
      <Field>
        <FieldLabel htmlFor={`field-${field.key}`}>{field.label}</FieldLabel>
        <NativeSelect
          id={`field-${field.key}`}
          value={action?.targetPageId ?? ''}
          className="w-full"
          onChange={(e) => {
            const val = e.target.value
            if (val) {
              editor.updateComponentAction(componentId, {
                kind: 'navigate',
                targetPageId: val,
              })
            } else {
              editor.updateComponentAction(componentId, undefined)
            }
          }}
        >
          <NativeSelectOption value="">None</NativeSelectOption>
          {otherPages.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    )
  }

  return null
}

function DebouncedInputField({
  field,
  editor,
  componentId,
  value,
  debounce,
}: {
  field: PropMapField & { inputType: 'input' }
  editor: KioskEditor
  componentId: string
  value: string
  debounce: boolean
}) {
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [componentId, value])

  const flush = useCallback(() => {
    if (pendingRef.current !== null) {
      editor.updateComponentProps(componentId, { [field.key]: pendingRef.current })
      pendingRef.current = null
    }
  }, [editor, componentId, field.key])

  const debouncedUpdate = useCallback(
    (text: string) => {
      pendingRef.current = text
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        flush()
      }, DEBOUNCE_MS)
    },
    [flush],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
        flush()
      }
    }
  }, [componentId, flush])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setLocalValue(v)
    if (debounce) {
      debouncedUpdate(v)
    } else {
      editor.updateComponentProps(componentId, { [field.key]: v })
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={`field-${field.key}`}>{field.label}</FieldLabel>
      <Input
        id={`field-${field.key}`}
        value={localValue}
        placeholder={field.componentProps?.placeholder}
        type={field.componentProps?.type ?? 'text'}
        onChange={handleChange}
      />
    </Field>
  )
}
