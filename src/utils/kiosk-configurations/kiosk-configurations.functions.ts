import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { useAppSession } from '@/utils/session.server'
import {
  createKioskConfiguration,
  getKioskConfigurationsByUser,
  getKioskConfigurationById,
  updateKioskConfigurationName,
  deleteKioskConfiguration,
} from '@/utils/kiosk-configurations/kiosk-configurations.server'

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
