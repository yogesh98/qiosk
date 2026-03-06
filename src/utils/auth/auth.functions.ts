import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
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
    const user = await createUser(data.email, data.password)

    const session = await useAppSession()
    await session.update({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
    })

    // throw redirect({ to: '/_authed' })
  })

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(credsSchema)
  .handler(async ({ data }) => {
    const user = await verifyUser(data.email, data.password)
    if (!user) return { error: 'Invalid credentials' as const }

    const session = await useAppSession()
    await session.update({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
    })

    // throw redirect({ to: '/_authed' })
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/' })
})

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useAppSession()
    if (!session.data.userId) return null
    return getUserById(session.data.userId)
  },
)