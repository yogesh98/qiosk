import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { useAppSession } from '@/utils/session.server'
import {
  appendKioskConfigurationContentEdit,
  createKioskConfiguration,
  getKioskConfigurationEditorState,
  getKioskConfigurationsByUser,
  getKioskConfigurationById,
  listKioskConfigurationContentVersions,
  saveKioskConfigurationContentVersion,
  undoKioskConfigurationContentEdit,
  updateKioskConfigurationName,
  deleteKioskConfiguration,
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

const appendContentEditSchema = z.object({
  id: z.string(),
  changeType: z.string().min(1).max(100),
  content: kioskConfigurationContentSchema,
  baseVersionId: z.string().optional(),
})

async function requireUserId() {
  const session = await useAppSession()
  if (!session.data.userId) throw new Error('Unauthorized')
  return session.data.userId
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

export const getKioskConfigurationEditorStateFn = createServerFn({ method: 'GET' })
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return (await getKioskConfigurationEditorState(data.id, userId))!
  })

export const listKioskConfigurationContentVersionsFn = createServerFn({
  method: 'GET',
})
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return listKioskConfigurationContentVersions(data.id, userId)
  })

export const appendKioskConfigurationContentEditFn = createServerFn({
  method: 'POST',
})
  .inputValidator(appendContentEditSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return appendKioskConfigurationContentEdit(
      data.id,
      data.changeType,
      data.content,
      userId,
      data.baseVersionId,
    )
  })

export const undoKioskConfigurationContentEditFn = createServerFn({
  method: 'POST',
})
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return undoKioskConfigurationContentEdit(data.id, userId)
  })

export const saveKioskConfigurationContentVersionFn = createServerFn({
  method: 'POST',
})
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const existing = await getKioskConfigurationById(data.id, userId)
    if (!existing) throw new Error('Configuration not found')
    return saveKioskConfigurationContentVersion(data.id, userId)
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
