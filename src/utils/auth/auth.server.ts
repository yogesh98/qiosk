import bcrypt from 'bcryptjs'
import { prisma } from '@/utils/db.server'

export async function createUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  const userCount = await prisma.user.count()
  const isFirstUser = userCount === 0
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role: isFirstUser ? 'admin' : 'creator',
      isApproved: isFirstUser,
    },
    select: { id: true, email: true, role: true },
  })
}

export type VerifyUserResult =
  | { id: string; email: string; role: string }
  | { notApproved: true }
  | null

export async function verifyUser(
  email: string,
  password: string,
): Promise<VerifyUserResult> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  if (!user.isApproved) return { notApproved: true }
  return { id: user.id, email: user.email, role: user.role }
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isApproved: true },
  })
}