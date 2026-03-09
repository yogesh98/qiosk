/**
 * Prop map schema for the Kiosk Inspector.
 * Components define their editable properties via a prop map;
 * the inspector renders the form generically from this map.
 * (Inspired by KioskPilot's propMap pattern)
 */

export type PropMapFieldInput = {
  key: string
  label: string
  inputType: 'input'
  componentProps?: { type?: string; placeholder?: string }
  /** If true, debounces updates (useful for text fields) */
  debounce?: boolean
}

export type PropMapFieldSelect = {
  key: string
  label: string
  inputType: 'select'
  options: Record<string, string> // value -> display label
  componentProps?: { placeholder?: string }
}

export type PropMapFieldSwitch = {
  key: string
  label: string
  inputType: 'switch'
}

/** Updates the component's action (e.g. navigate), not props */
export type PropMapFieldPageSelect = {
  key: string
  label: string
  inputType: 'pageSelect'
  /** Maps to action.kind when present - for now only 'navigate' */
  actionKind?: 'navigate'
}

export type PropMapField =
  | PropMapFieldInput
  | PropMapFieldSelect
  | PropMapFieldSwitch
  | PropMapFieldPageSelect

/** A component's prop map: ordered array of field definitions */
export type PropMap = Array<PropMapField>

export function isPropsField(
  field: PropMapField,
): field is PropMapFieldInput | PropMapFieldSelect | PropMapFieldSwitch {
  return field.inputType !== 'pageSelect'
}

export function isActionField(
  field: PropMapField,
): field is PropMapFieldPageSelect {
  return field.inputType === 'pageSelect'
}
