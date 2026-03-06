import bcrypt from 'bcryptjs'
import { prisma } from '@/utils/db.server'

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      isApproved: true,
      createdAt: true,
    },
  })
}

export async function createUserAsAdmin(
  email: string,
  password: string,
  role: string,
) {
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.create({
    data: { email, passwordHash, role, isApproved: true },
    select: { id: true, email: true, role: true, isApproved: true },
  })
}

export async function updateUser(
  id: string,
  data: { email?: string; role?: string; isApproved?: boolean },
) {
  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, isApproved: true },
  })
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
  })
}
