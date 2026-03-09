import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireRole } from '@/utils/auth/rbac'
import {
  countApprovedAdmins,
  createUserAsAdmin,
  deleteUser,
  listUsers,
  updateUser,
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
    const admin = await requireRole('admin')
    const { id, ...updates } = data

    if (id === admin.id) {
      if (updates.role && updates.role !== 'admin') {
        throw new Error('You cannot change your own role away from admin')
      }

      if (updates.isApproved === false) {
        throw new Error('You cannot remove your own approval')
      }
    }

    const currentUser = listUsers().then((users) => users.find((user) => user.id === id))
    const approvedAdminCount = countApprovedAdmins()
    const [existingUser, currentApprovedAdminCount] = await Promise.all([
      currentUser,
      approvedAdminCount,
    ])

    if (!existingUser) {
      throw new Error('User not found')
    }

    const nextRole = updates.role ?? existingUser.role
    const nextIsApproved = updates.isApproved ?? existingUser.isApproved
    const removesApprovedAdmin =
      existingUser.role === 'admin' &&
      existingUser.isApproved &&
      (nextRole !== 'admin' || nextIsApproved === false)

    if (removesApprovedAdmin && currentApprovedAdminCount <= 1) {
      throw new Error('At least one approved admin must remain')
    }

    return updateUser(id, updates)
  })

export const deleteUserFn = createServerFn({ method: 'POST' })
  .inputValidator(byIdSchema)
  .handler(async ({ data }) => {
    const admin = await requireRole('admin')
    if (data.id === admin.id) {
      throw new Error('You cannot delete your own account')
    }

    const users = await listUsers()
    const existingUser = users.find((user) => user.id === data.id)
    if (!existingUser) {
      throw new Error('User not found')
    }

    if (existingUser.role === 'admin' && existingUser.isApproved) {
      const approvedAdminCount = await countApprovedAdmins()
      if (approvedAdminCount <= 1) {
        throw new Error('At least one approved admin must remain')
      }
    }

    await deleteUser(data.id)
  })
