import { prisma } from '@/utils/db.server'

export async function createKioskConfiguration(
  name: string,
  width: number,
  height: number,
  createdById: string,
) {
  return prisma.kioskConfiguration.create({
    data: { name, width, height, createdById },
  })
}

export async function getKioskConfigurationsByUser(userId: string) {
  return prisma.kioskConfiguration.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getKioskConfigurationById(id: string, userId: string) {
  return prisma.kioskConfiguration.findFirst({
    where: { id, createdById: userId },
  })
}

export async function updateKioskConfigurationName(
  id: string,
  name: string,
  userId: string,
) {
  return prisma.kioskConfiguration.updateMany({
    where: { id, createdById: userId },
    data: { name },
  })
}

export async function deleteKioskConfiguration(id: string, userId: string) {
  return prisma.kioskConfiguration.deleteMany({
    where: { id, createdById: userId },
  })
}
