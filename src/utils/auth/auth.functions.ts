import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { useAppSession } from '@/utils/session.server'
import { createUser, verifyUser, getUserById } from '@/utils/auth/auth.server'

const credsSchema = z.object({
  email: z.string().max(255).pipe(z.email()),
  password: z.string().min(8).max(100),
})

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(credsSchema)
  .handler(async ({ data }) => {
    await createUser(data.email, data.password)
  })

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(credsSchema)
  .handler(async ({ data }) => {
    const result = await verifyUser(data.email, data.password)
    if (!result) return { error: 'Invalid credentials' as const }
    if ('notApproved' in result) return { error: 'not_approved' as const }

    const session = await useAppSession()
    await session.update({
      userId: result.id,
      userEmail: result.email,
      role: result.role,
    })
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
})

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useAppSession()
    if (!session.data.userId) return null
    const user = await getUserById(session.data.userId)
    if (!user?.isApproved) return null
    return user
  },
)