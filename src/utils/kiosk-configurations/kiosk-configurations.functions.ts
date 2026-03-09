import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireApprovedUser } from '@/utils/auth/rbac'
import {
  createKioskConfiguration,
  deleteKioskConfiguration,
  duplicateKioskConfiguration,
  getKioskConfigurationById,
  getKioskConfigurationEditorState,
  getKioskConfigurationManagementState,
  getKioskConfigurationViewerState,
  getKioskConfigurationsByUser,
  saveKioskConfiguration,
  saveKioskConfigurationAsNewVersion,
  updateKioskConfigurationName,
} from '@/utils/kiosk-configurations/kiosk-configurations.server'
import { kioskConfigurationContentSchema } from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

const updateNameSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
})

const byIdSchema = z.object({
  id: z.string(),
})

const managementStateSchema = z.object({
  id: z.string(),
})

const editorStateSchema = z.object({
  id: z.string(),
  sourceVersionId: z.string().optional(),
})

const viewerStateSchema = z.object({
  id: z.string(),
  versionId: z.string().optional(),
})

const saveContentSchema = z.object({
  id: z.string(),
  content: kioskConfigurationContentSchema,
})

async function requireUserId() {
  const user = await requireApprovedUser()
  return user.id
}

export const createKioskConfigurationFn = createServerFn({ method: 'POST' })
  .inputValidator(createSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return createKioskConfiguration(data.name, data.width, data.height, userId)
  })

export const listKioskConfigurationsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const userId = await requireUserId()
    return getKioskConfigurationsByUser(userId)
  })

export const getKioskConfigurationFn = createServerFn({ method: 'GET' })
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return getKioskConfigurationById(data.id, userId)
  })

export const getKioskConfigurationManagementStateFn = createServerFn({
  method: 'GET',
})
  .inputValidator(managementStateSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return (await getKioskConfigurationManagementState(data.id, userId))!
  })

export const getKioskConfigurationEditorStateFn = createServerFn({ method: 'GET' })
  .inputValidator(editorStateSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return (await getKioskConfigurationEditorState(
      data.id,
      userId,
      data.sourceVersionId,
    ))!
  })

export const saveKioskConfigurationFn = createServerFn({
  method: 'POST',
})
  .inputValidator(saveContentSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return saveKioskConfiguration(data.id, data.content, userId)
  })

export const saveKioskConfigurationAsNewVersionFn = createServerFn({
  method: 'POST',
})
  .inputValidator(saveContentSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return saveKioskConfigurationAsNewVersion(data.id, data.content, userId)
  })

export const updateKioskConfigurationNameFn = createServerFn({ method: 'POST' })
  .inputValidator(updateNameSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    await updateKioskConfigurationName(data.id, data.name, userId)
  })

export const deleteKioskConfigurationFn = createServerFn({ method: 'POST' })
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    await deleteKioskConfiguration(data.id, userId)
  })

export const duplicateKioskConfigurationFn = createServerFn({ method: 'POST' })
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return duplicateKioskConfiguration(data.id, userId)
  })

export const getKioskConfigurationViewerStateFn = createServerFn({ method: 'GET' })
  .inputValidator(viewerStateSchema)
  .handler(async ({ data }) => {
    const state = await getKioskConfigurationViewerState(data.id, data.versionId)
    if (!state) throw new Error('Configuration not found')
    return state
  })
