import { z } from 'zod'

export const kioskConfigurationContentActionSchema = z.object({
  kind: z.literal('navigate'),
  targetPageId: z.string().min(1),
})

export const kioskConfigurationContentLayoutSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  w: z.number().positive(),
  h: z.number().positive(),
  zIndex: z.number().int().nonnegative(),
})

export const buttonPropsSchema = z.object({
  text: z.string(),
  size: z.enum(['default', 'xs', 'sm', 'lg']),
  variant: z.enum(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']),
  disabled: z.boolean().optional(),
})

export const kioskConfigurationContentComponentSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['button']),
  layout: kioskConfigurationContentLayoutSchema,
  props: z.union([buttonPropsSchema]),
  action: kioskConfigurationContentActionSchema.optional(),
})

export const kioskConfigurationContentPageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  components: z.array(kioskConfigurationContentComponentSchema),
})

export const kioskConfigurationContentSchema = z.object({
  schemaVersion: z.literal(1),
  pages: z.array(kioskConfigurationContentPageSchema),
})

export type KioskConfigurationContentAction = z.infer<
  typeof kioskConfigurationContentActionSchema
>
export type KioskConfigurationContentLayout = z.infer<
  typeof kioskConfigurationContentLayoutSchema
>
export type ButtonProps = z.infer<typeof buttonPropsSchema>
export type KioskConfigurationContentComponent = z.infer<
  typeof kioskConfigurationContentComponentSchema
>
export type KioskConfigurationContentPage = z.infer<
  typeof kioskConfigurationContentPageSchema
>
export type KioskConfigurationContent = z.infer<
  typeof kioskConfigurationContentSchema
>

let _idCounter = 0
export function generateId(prefix: string = 'cmp'): string {
  return `${prefix}_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`
}

export function createDefaultButtonProps(): ButtonProps {
  return {
    text: '',
    size: 'default',
    variant: 'default',
    disabled: false,
  }
}

export function createDefaultPage(
  name: string = 'Page 1',
): KioskConfigurationContentPage {
  return {
    id: generateId('page'),
    name,
    components: [],
  }
}

export function createEmptyKioskConfigurationContent(): KioskConfigurationContent {
  return {
    schemaVersion: 1,
    pages: [],
  }
}

export function createDefaultKioskConfigurationContent(): KioskConfigurationContent {
  return {
    schemaVersion: 1,
    pages: [createDefaultPage()],
  }
}

export function parseKioskConfigurationContent(
  content: string | null | undefined,
): KioskConfigurationContent {
  if (!content) {
    return createEmptyKioskConfigurationContent()
  }

  return kioskConfigurationContentSchema.parse(JSON.parse(content))
}

export function serializeKioskConfigurationContent(
  content: KioskConfigurationContent,
): string {
  return JSON.stringify(kioskConfigurationContentSchema.parse(content))
}
