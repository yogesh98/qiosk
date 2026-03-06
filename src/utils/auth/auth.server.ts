import bcrypt from 'bcryptjs'
import { prisma } from '@/utils/db.server'

export async function createUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, role: true },
  })
}

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  return { id: user.id, email: user.email, role: user.role }
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  })
}