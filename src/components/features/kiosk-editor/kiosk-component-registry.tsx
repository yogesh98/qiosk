import type { ReactNode } from 'react'
import type {
  ButtonProps,
  KioskConfigurationContentComponent,
  KioskConfigurationContentLayout,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import {
  createDefaultButtonProps,
  generateId,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import { ButtonBlock } from '@/components/features/kiosk-editor/components/ButtonBlock'
import type { PropMap } from '@/components/features/kiosk-editor/kiosk-inspector-prop-map'

export type ComponentTypeId = 'button'

export type ComponentRegistryEntry = {
  type: ComponentTypeId
  label: string
  createDefault: (canvasW: number, canvasH: number) => KioskConfigurationContentComponent
  render: (props: Record<string, unknown>, selected: boolean) => ReactNode
  /** Defines the inspector form fields for this component */
  propMap: PropMap
}

function defaultLayout(canvasW: number, canvasH: number): KioskConfigurationContentLayout {
  return {
    x: Math.round(canvasW / 2 - 60),
    y: Math.round(canvasH / 2 - 20),
    w: 120,
    h: 40,
    zIndex: 0,
  }
}

export const componentRegistry: Record<ComponentTypeId, ComponentRegistryEntry> = {
  button: {
    type: 'button',
    label: 'Button',
    createDefault: (canvasW, canvasH) => ({
      id: generateId('btn'),
      type: 'button',
      layout: defaultLayout(canvasW, canvasH),
      props: createDefaultButtonProps(),
    }),
    render: (props, selected) => (
      <ButtonBlock props={props as ButtonProps} selected={selected} />
    ),
    propMap: [
      {
        key: 'text',
        label: 'Text',
        inputType: 'input',
        componentProps: { type: 'text', placeholder: 'Button text' },
        debounce: true,
      },
      {
        key: 'size',
        label: 'Size',
        inputType: 'select',
        options: {
          xs: 'Extra Small',
          sm: 'Small',
          default: 'Default',
          lg: 'Large',
        },
      },
      {
        key: 'variant',
        label: 'Variant',
        inputType: 'select',
        options: {
          default: 'Default',
          secondary: 'Secondary',
          outline: 'Outline',
          ghost: 'Ghost',
          destructive: 'Destructive',
          link: 'Link',
        },
      },
      {
        key: 'disabled',
        label: 'Disabled',
        inputType: 'switch',
      },
      {
        key: 'navigateTo',
        label: 'Navigate to',
        inputType: 'pageSelect',
        actionKind: 'navigate',
      },
    ],
  },
}

export const componentTypes = Object.values(componentRegistry)
