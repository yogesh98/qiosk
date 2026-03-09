-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'creator',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KioskConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '{"schemaVersion":1,"pages":[]}',
    "currentVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "KioskConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KioskConfiguration_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "KioskConfigurationVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KioskConfigurationVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "kioskConfigurationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "KioskConfigurationVersion_kioskConfigurationId_fkey" FOREIGN KEY ("kioskConfigurationId") REFERENCES "KioskConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KioskConfigurationVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KioskConfigurationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kioskConfigurationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "KioskConfigurationLog_kioskConfigurationId_fkey" FOREIGN KEY ("kioskConfigurationId") REFERENCES "KioskConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KioskConfigurationLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "KioskConfigurationVersion_kioskConfigurationId_createdAt_idx" ON "KioskConfigurationVersion"("kioskConfigurationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KioskConfigurationVersion_kioskConfigurationId_version_key" ON "KioskConfigurationVersion"("kioskConfigurationId", "version");

-- CreateIndex
CREATE INDEX "KioskConfigurationLog_kioskConfigurationId_createdAt_idx" ON "KioskConfigurationLog"("kioskConfigurationId", "createdAt");
