import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireRole } from '@/utils/auth/rbac'
import {
  listUsers,
  createUserAsAdmin,
  updateUser,
  deleteUser,
} from '@/utils/users/users.server'

const createSchema = z.object({
  email: z.string().max(255).pipe(z.email()),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'publisher', 'creator']),
})

const updateSchema = z.object({
  id: z.string(),
  email: z.string().max(255).pipe(z.email()).optional(),
  role: z.enum(['admin', 'publisher', 'creator']).optional(),
  isApproved: z.boolean().optional(),
})

const byIdSchema = z.object({
  id: z.string(),
})

export const listUsersFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole('admin')
    return listUsers()
  },
)

export const createUserFn = createServerFn({ method: 'POST' })
  .inputValidator(createSchema)
  .handler(async ({ data }) => {
    await requireRole('admin')
    return createUserAsAdmin(data.email, data.password, data.role)
  })

export const updateUserFn = createServerFn({ method: 'POST' })
  .inputValidator(updateSchema)
  .handler(async ({ data }) => {
    await requireRole('admin')
    const { id, ...updates } = data
    return updateUser(id, updates)
  })

export const deleteUserFn = createServerFn({ method: 'POST' })
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const admin = await requireRole('admin')
    if (data.id === admin.id) {
      throw new Error('You cannot delete your own account')
    }
    await deleteUser(data.id)
  })
