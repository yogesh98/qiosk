import { useAppSession } from '@/utils/session.server'
import { getUserById } from '@/utils/auth/auth.server'

export const ROLES = ['creator', 'publisher', 'admin'] as const
export type Role = (typeof ROLES)[number]

const ROLE_RANK: Record<string, number> = {
  creator: 0,
  publisher: 1,
  admin: 2,
}

export function hasRoleAtLeast(userRole: string, required: Role): boolean {
  const userRank = ROLE_RANK[userRole] ?? -1
  const requiredRank = ROLE_RANK[required] ?? 0
  return userRank >= requiredRank
}

export async function requireApprovedUser() {
  const session = await useAppSession()
  const userId = session.data.userId
  if (!userId) throw new Error('Unauthorized')
  const user = await getUserById(userId)
  if (!user?.isApproved) throw new Error('Unauthorized')
  return user
}

export async function requireRole(required: Role) {
  const user = await requireApprovedUser()
  if (!hasRoleAtLeast(user.role, required)) throw new Error('Forbidden')
  return user
}
