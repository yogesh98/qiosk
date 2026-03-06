import { prisma } from '@/utils/db.server'
import {
  createEmptyKioskConfigurationContent,
  parseKioskConfigurationContent,
  serializeKioskConfigurationContent,
  type KioskConfigurationContent,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'

type ContentEditRecord = {
  id: string
  revision: number
  changeType: string
  baseVersionId: string | null
  createdAt: Date
  createdById: string
  content: string
}

type ContentVersionRecord = {
  id: string
  version: number
  createdAt: Date
  createdById: string
  content: string
}

export type KioskConfigurationContentEditSummary = Omit<
  ContentEditRecord,
  'content'
>

export type KioskConfigurationContentVersionSummary = Omit<
  ContentVersionRecord,
  'content'
>

export type KioskConfigurationResolvedContent = {
  currentContent: KioskConfigurationContent
  latestEdit: KioskConfigurationContentEditSummary | null
  latestVersion: KioskConfigurationContentVersionSummary | null
}

export type KioskConfigurationEditorState = KioskConfigurationResolvedContent & {
  configuration: NonNullable<Awaited<ReturnType<typeof getKioskConfigurationById>>>
  versions: KioskConfigurationContentVersionSummary[]
}

function toContentEditSummary(
  edit: ContentEditRecord | null,
): KioskConfigurationContentEditSummary | null {
  if (!edit) return null

  const { content: _content, ...summary } = edit
  return summary
}

function toContentVersionSummary(
  version: ContentVersionRecord | null,
): KioskConfigurationContentVersionSummary | null {
  if (!version) return null

  const { content: _content, ...summary } = version
  return summary
}

function resolveCurrentContentFromRecords(
  latestEdit: ContentEditRecord | null,
  latestVersion: ContentVersionRecord | null,
) {
  if (latestEdit) {
    return parseKioskConfigurationContent(latestEdit.content)
  }

  if (latestVersion) {
    return parseKioskConfigurationContent(latestVersion.content)
  }

  return createEmptyKioskConfigurationContent()
}

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

export async function listKioskConfigurationContentVersions(
  kioskConfigurationId: string,
  userId: string,
) {
  const versions = await prisma.kioskConfigurationContentVersion.findMany({
    where: {
      kioskConfigurationId,
      kioskConfiguration: { createdById: userId },
    },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  })

  return versions.map((version) => toContentVersionSummary(version)!)
}

export async function resolveKioskConfigurationContent(
  kioskConfigurationId: string,
  userId: string,
): Promise<KioskConfigurationResolvedContent> {
  const [latestEdit, latestVersion] = await Promise.all([
    prisma.kioskConfigurationContentEdit.findFirst({
      where: {
        kioskConfigurationId,
        kioskConfiguration: { createdById: userId },
      },
      orderBy: [{ revision: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.kioskConfigurationContentVersion.findFirst({
      where: {
        kioskConfigurationId,
        kioskConfiguration: { createdById: userId },
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return {
    currentContent: resolveCurrentContentFromRecords(latestEdit, latestVersion),
    latestEdit: toContentEditSummary(latestEdit),
    latestVersion: toContentVersionSummary(latestVersion),
  }
}

export async function getKioskConfigurationEditorState(
  kioskConfigurationId: string,
  userId: string,
): Promise<KioskConfigurationEditorState | null> {
  const configuration = await getKioskConfigurationById(kioskConfigurationId, userId)

  if (!configuration) return null

  const [resolvedContent, versions] = await Promise.all([
    resolveKioskConfigurationContent(kioskConfigurationId, userId),
    listKioskConfigurationContentVersions(kioskConfigurationId, userId),
  ])

  return {
    configuration,
    ...resolvedContent,
    versions,
  }
}

export async function appendKioskConfigurationContentEdit(
  kioskConfigurationId: string,
  changeType: string,
  content: KioskConfigurationContent,
  userId: string,
  baseVersionId?: string,
) {
  const serializedContent = serializeKioskConfigurationContent(content)

  return prisma.$transaction(async (tx) => {
    const [latestEdit, latestVersion] = await Promise.all([
      tx.kioskConfigurationContentEdit.findFirst({
        where: {
          kioskConfigurationId,
          kioskConfiguration: { createdById: userId },
        },
        orderBy: [{ revision: 'desc' }, { createdAt: 'desc' }],
      }),
      tx.kioskConfigurationContentVersion.findFirst({
        where: {
          kioskConfigurationId,
          kioskConfiguration: { createdById: userId },
        },
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      }),
    ])

    if (baseVersionId) {
      const baseVersion = await tx.kioskConfigurationContentVersion.findFirst({
        where: {
          id: baseVersionId,
          kioskConfigurationId,
          kioskConfiguration: { createdById: userId },
        },
      })

      if (!baseVersion) {
        throw new Error('Base version not found')
      }
    }

    const createdEdit = await tx.kioskConfigurationContentEdit.create({
      data: {
        kioskConfigurationId,
        revision: (latestEdit?.revision ?? 0) + 1,
        changeType,
        content: serializedContent,
        baseVersionId: baseVersionId ?? latestVersion?.id ?? null,
        createdById: userId,
      },
    })

    return {
      currentContent: parseKioskConfigurationContent(createdEdit.content),
      latestEdit: toContentEditSummary(createdEdit),
      latestVersion: toContentVersionSummary(latestVersion),
    }
  })
}

export async function undoKioskConfigurationContentEdit(
  kioskConfigurationId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const latestEdit = await tx.kioskConfigurationContentEdit.findFirst({
      where: {
        kioskConfigurationId,
        kioskConfiguration: { createdById: userId },
      },
      orderBy: [{ revision: 'desc' }, { createdAt: 'desc' }],
    })

    if (!latestEdit) {
      throw new Error('Nothing to undo')
    }

    await tx.kioskConfigurationContentEdit.delete({
      where: { id: latestEdit.id },
    })

    const [previousEdit, latestVersion] = await Promise.all([
      tx.kioskConfigurationContentEdit.findFirst({
        where: {
          kioskConfigurationId,
          kioskConfiguration: { createdById: userId },
        },
        orderBy: [{ revision: 'desc' }, { createdAt: 'desc' }],
      }),
      tx.kioskConfigurationContentVersion.findFirst({
        where: {
          kioskConfigurationId,
          kioskConfiguration: { createdById: userId },
        },
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      }),
    ])

    return {
      removedEdit: toContentEditSummary(latestEdit),
      currentContent: resolveCurrentContentFromRecords(previousEdit, latestVersion),
      latestEdit: toContentEditSummary(previousEdit),
      latestVersion: toContentVersionSummary(latestVersion),
    }
  })
}

export async function saveKioskConfigurationContentVersion(
  kioskConfigurationId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const [latestEdit, latestVersion] = await Promise.all([
      tx.kioskConfigurationContentEdit.findFirst({
        where: {
          kioskConfigurationId,
          kioskConfiguration: { createdById: userId },
        },
        orderBy: [{ revision: 'desc' }, { createdAt: 'desc' }],
      }),
      tx.kioskConfigurationContentVersion.findFirst({
        where: {
          kioskConfigurationId,
          kioskConfiguration: { createdById: userId },
        },
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      }),
    ])

    const currentContent = resolveCurrentContentFromRecords(latestEdit, latestVersion)

    const createdVersion = await tx.kioskConfigurationContentVersion.create({
      data: {
        kioskConfigurationId,
        version: (latestVersion?.version ?? 0) + 1,
        content: serializeKioskConfigurationContent(currentContent),
        createdById: userId,
      },
    })

    return {
      currentContent,
      latestEdit: toContentEditSummary(latestEdit),
      latestVersion: toContentVersionSummary(createdVersion),
    }
  })
}
