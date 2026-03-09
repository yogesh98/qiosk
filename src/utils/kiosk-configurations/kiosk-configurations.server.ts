import type { Prisma } from '@/generated/prisma/client'
import type { KioskConfigurationContent } from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'
import { prisma } from '@/utils/db.server'
import {
  createDefaultKioskConfigurationContent,
  parseKioskConfigurationContent,
  serializeKioskConfigurationContent,
} from '@/utils/kiosk-configurations/kiosk-configuration-content.schema'

type ConfigurationRecord = Awaited<
  ReturnType<typeof getKioskConfigurationById>
>
type PublicConfigurationRecord = Awaited<
  ReturnType<typeof getKioskConfigurationByIdPublic>
>
type DuplicateNameClient =
  | Prisma.TransactionClient
  | typeof prisma

export type KioskConfigurationLogSummary = {
  id: string
  message: string
  createdAt: Date
  createdById: string
}

export type KioskConfigurationVersionSummary = {
  id: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export type KioskConfigurationEditorState = {
  configuration: NonNullable<ConfigurationRecord>
  currentContent: KioskConfigurationContent
  currentVersion: KioskConfigurationVersionSummary | null
  sourceVersion: KioskConfigurationVersionSummary | null
  versions: Array<KioskConfigurationVersionSummary>
  recentLogs: Array<KioskConfigurationLogSummary>
}

export type KioskConfigurationManagementState = {
  configuration: NonNullable<ConfigurationRecord>
  currentVersion: KioskConfigurationVersionSummary | null
  versions: Array<KioskConfigurationVersionSummary>
}

const DEFAULT_LOG_LIMIT = 20

function toVersionSummary(
  version:
    | {
        id: string
        version: number
        createdAt: Date
        updatedAt: Date
      }
    | null
    | undefined,
): KioskConfigurationVersionSummary | null {
  if (!version) return null

  return {
    id: version.id,
    version: version.version,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  }
}

function createLogMessage(message: string) {
  return message.trim() || 'Updated configuration'
}

async function getKioskConfigurationVersionById(
  versionId: string,
  userId: string,
) {
  return prisma.kioskConfigurationVersion.findFirst({
    where: {
      id: versionId,
      kioskConfiguration: { createdById: userId },
    },
  })
}

async function getPublicKioskConfigurationVersionById(
  kioskConfigurationId: string,
  versionId: string,
) {
  return prisma.kioskConfigurationVersion.findFirst({
    where: {
      id: versionId,
      kioskConfigurationId,
    },
  })
}

async function buildUniqueDuplicateName(
  sourceName: string,
  userId: string,
  db: DuplicateNameClient,
) {
  const baseName = `${sourceName} Copy`
  const existingNames = await db.kioskConfiguration.findMany({
    where: {
      createdById: userId,
      OR: [
        { name: baseName },
        { name: { startsWith: `${baseName} ` } },
      ],
    },
    select: { name: true },
  })

  const existing = new Set(existingNames.map((item) => item.name))
  if (!existing.has(baseName)) return baseName

  let copyNumber = 2
  while (existing.has(`${baseName} ${copyNumber}`)) {
    copyNumber += 1
  }

  return `${baseName} ${copyNumber}`
}

export async function createKioskConfiguration(
  name: string,
  width: number,
  height: number,
  createdById: string,
) {
  return prisma.kioskConfiguration.create({
    data: {
      name,
      width,
      height,
      createdById,
    },
    include: {
      currentVersion: true,
    },
  })
}

export async function getKioskConfigurationsByUser(userId: string) {
  return prisma.kioskConfiguration.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      currentVersion: true,
    },
  })
}

export async function getKioskConfigurationById(id: string, userId: string) {
  return prisma.kioskConfiguration.findFirst({
    where: { id, createdById: userId },
    include: {
      currentVersion: true,
    },
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

export async function listKioskConfigurationLogs(
  kioskConfigurationId: string,
  userId: string,
  limit: number = DEFAULT_LOG_LIMIT,
) {
  return prisma.kioskConfigurationLog.findMany({
    where: {
      kioskConfigurationId,
      kioskConfiguration: { createdById: userId },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function listKioskConfigurationVersions(
  kioskConfigurationId: string,
  userId: string,
) {
  const versions = await prisma.kioskConfigurationVersion.findMany({
    where: {
      kioskConfigurationId,
      kioskConfiguration: { createdById: userId },
    },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  })

  return versions.map((version) => toVersionSummary(version)!)
}

export async function getKioskConfigurationManagementState(
  kioskConfigurationId: string,
  userId: string,
): Promise<KioskConfigurationManagementState | null> {
  const configuration = await getKioskConfigurationById(kioskConfigurationId, userId)
  if (!configuration) return null

  const versions = await listKioskConfigurationVersions(kioskConfigurationId, userId)

  return {
    configuration,
    currentVersion: toVersionSummary(configuration.currentVersion),
    versions,
  }
}

export async function getKioskConfigurationEditorState(
  kioskConfigurationId: string,
  userId: string,
  sourceVersionId?: string | null,
): Promise<KioskConfigurationEditorState | null> {
  const configuration = await getKioskConfigurationById(kioskConfigurationId, userId)
  if (!configuration) return null

  const [recentLogs, versions, sourceVersionRecord] = await Promise.all([
    listKioskConfigurationLogs(kioskConfigurationId, userId),
    listKioskConfigurationVersions(kioskConfigurationId, userId),
    sourceVersionId
      ? getKioskConfigurationVersionById(sourceVersionId, userId)
      : Promise.resolve(null),
  ])

  if (sourceVersionId && !sourceVersionRecord) {
    throw new Error('Version not found')
  }

  if (
    sourceVersionRecord &&
    sourceVersionRecord.kioskConfigurationId !== kioskConfigurationId
  ) {
    throw new Error('Version not found')
  }

  const sourceVersion = sourceVersionRecord
    ? toVersionSummary(sourceVersionRecord)
    : null
  const selectedContent = sourceVersionRecord?.content
    ?? configuration.currentVersion?.content

  return {
    configuration,
    currentContent: parseKioskConfigurationContent(selectedContent),
    currentVersion: toVersionSummary(configuration.currentVersion),
    sourceVersion,
    versions,
    recentLogs,
  }
}

async function createOrUpdateCurrentVersion(
  tx: Prisma.TransactionClient,
  kioskConfigurationId: string,
  content: string,
  userId: string,
) {
  const configuration = await tx.kioskConfiguration.findFirst({
    where: { id: kioskConfigurationId, createdById: userId },
    include: {
      currentVersion: true,
    },
  })

  if (!configuration) {
    throw new Error('Configuration not found')
  }

  if (configuration.currentVersion) {
    const version = await tx.kioskConfigurationVersion.update({
      where: { id: configuration.currentVersion.id },
      data: { content },
    })

    return {
      configurationVersion: version,
      createdNewVersion: false,
    }
  }

  const latestVersion = await tx.kioskConfigurationVersion.findFirst({
    where: { kioskConfigurationId },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  })

  const version = await tx.kioskConfigurationVersion.create({
    data: {
      kioskConfigurationId,
      version: (latestVersion?.version ?? 0) + 1,
      content,
      createdById: userId,
    },
  })

  await tx.kioskConfiguration.update({
    where: { id: kioskConfigurationId },
    data: {
      currentVersionId: version.id,
    },
  })

  return {
    configurationVersion: version,
    createdNewVersion: true,
  }
}

export async function saveKioskConfiguration(
  kioskConfigurationId: string,
  content: KioskConfigurationContent,
  userId: string,
) {
  const serializedContent = serializeKioskConfigurationContent(content)

  return prisma.$transaction(async (tx) => {
    const { configurationVersion, createdNewVersion } =
      await createOrUpdateCurrentVersion(
        tx,
        kioskConfigurationId,
        serializedContent,
        userId,
      )

    const latestLog = await tx.kioskConfigurationLog.create({
      data: {
        kioskConfigurationId,
        message: createdNewVersion
          ? `Created version ${configurationVersion.version}`
          : `Saved version ${configurationVersion.version}`,
        createdById: userId,
      },
    })

    return {
      currentContent: content,
      currentVersion: toVersionSummary(configurationVersion),
      latestLog,
    }
  })
}

export async function saveKioskConfigurationAsNewVersion(
  kioskConfigurationId: string,
  content: KioskConfigurationContent,
  userId: string,
) {
  const serializedContent = serializeKioskConfigurationContent(content)

  return prisma.$transaction(async (tx) => {
    const configuration = await tx.kioskConfiguration.findFirst({
      where: { id: kioskConfigurationId, createdById: userId },
    })

    if (!configuration) {
      throw new Error('Configuration not found')
    }

    const latestVersion = await tx.kioskConfigurationVersion.findFirst({
      where: { kioskConfigurationId },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    })

    const createdVersion = await tx.kioskConfigurationVersion.create({
      data: {
        kioskConfigurationId,
        version: (latestVersion?.version ?? 0) + 1,
        content: serializedContent,
        createdById: userId,
      },
    })

    await tx.kioskConfiguration.update({
      where: { id: kioskConfigurationId },
      data: {
        currentVersionId: createdVersion.id,
      },
    })

    const latestLog = await tx.kioskConfigurationLog.create({
      data: {
        kioskConfigurationId,
        message: createLogMessage(`Created version ${createdVersion.version}`),
        createdById: userId,
      },
    })

    return {
      currentContent: content,
      currentVersion: toVersionSummary(createdVersion),
      latestLog,
    }
  })
}

export async function duplicateKioskConfiguration(
  kioskConfigurationId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const configuration = await tx.kioskConfiguration.findFirst({
      where: { id: kioskConfigurationId, createdById: userId },
      include: {
        currentVersion: true,
      },
    })

    if (!configuration) {
      throw new Error('Configuration not found')
    }

    const duplicatedName = await buildUniqueDuplicateName(
      configuration.name,
      userId,
      tx,
    )
    const duplicatedConfiguration = await tx.kioskConfiguration.create({
      data: {
        name: duplicatedName,
        width: configuration.width,
        height: configuration.height,
        createdById: userId,
      },
    })

    const initialContent = configuration.currentVersion?.content
      ?? serializeKioskConfigurationContent(
        createDefaultKioskConfigurationContent(),
      )

    const initialVersion = await tx.kioskConfigurationVersion.create({
      data: {
        kioskConfigurationId: duplicatedConfiguration.id,
        version: 1,
        content: initialContent,
        createdById: userId,
      },
    })

    await tx.kioskConfiguration.update({
      where: { id: duplicatedConfiguration.id },
      data: {
        currentVersionId: initialVersion.id,
      },
    })

    await tx.kioskConfigurationLog.create({
      data: {
        kioskConfigurationId: duplicatedConfiguration.id,
        message: createLogMessage('Created version 1'),
        createdById: userId,
      },
    })

    return tx.kioskConfiguration.findUniqueOrThrow({
      where: { id: duplicatedConfiguration.id },
      include: {
        currentVersion: true,
      },
    })
  })
}

export async function getKioskConfigurationByIdPublic(id: string) {
  return prisma.kioskConfiguration.findFirst({
    where: { id },
    include: {
      currentVersion: true,
    },
  })
}

export type KioskConfigurationViewerState = {
  configuration: NonNullable<PublicConfigurationRecord>
  currentContent: KioskConfigurationContent
  currentVersion: KioskConfigurationVersionSummary | null
  viewingVersion: KioskConfigurationVersionSummary | null
}

export async function getKioskConfigurationViewerState(
  kioskConfigurationId: string,
  versionId?: string | null,
): Promise<KioskConfigurationViewerState | null> {
  const configuration = await getKioskConfigurationByIdPublic(kioskConfigurationId)
  if (!configuration) return null

  const viewingVersionRecord = versionId
    ? await getPublicKioskConfigurationVersionById(kioskConfigurationId, versionId)
    : configuration.currentVersion

  if (versionId && !viewingVersionRecord) {
    return null
  }

  return {
    configuration,
    currentContent: parseKioskConfigurationContent(
      viewingVersionRecord?.content ?? configuration.currentVersion?.content,
    ),
    currentVersion: toVersionSummary(configuration.currentVersion),
    viewingVersion: toVersionSummary(viewingVersionRecord),
  }
}
