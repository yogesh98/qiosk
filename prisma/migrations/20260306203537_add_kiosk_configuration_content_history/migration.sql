-- CreateTable
CREATE TABLE "KioskConfigurationContentEdit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revision" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kioskConfigurationId" TEXT NOT NULL,
    "baseVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "KioskConfigurationContentEdit_kioskConfigurationId_fkey" FOREIGN KEY ("kioskConfigurationId") REFERENCES "KioskConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KioskConfigurationContentEdit_baseVersionId_fkey" FOREIGN KEY ("baseVersionId") REFERENCES "KioskConfigurationContentVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KioskConfigurationContentEdit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KioskConfigurationContentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kioskConfigurationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "KioskConfigurationContentVersion_kioskConfigurationId_fkey" FOREIGN KEY ("kioskConfigurationId") REFERENCES "KioskConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KioskConfigurationContentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "KioskConfigurationContentEdit_kioskConfigurationId_createdAt_idx" ON "KioskConfigurationContentEdit"("kioskConfigurationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KioskConfigurationContentEdit_kioskConfigurationId_revision_key" ON "KioskConfigurationContentEdit"("kioskConfigurationId", "revision");

-- CreateIndex
CREATE INDEX "KioskConfigurationContentVersion_kioskConfigurationId_createdAt_idx" ON "KioskConfigurationContentVersion"("kioskConfigurationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KioskConfigurationContentVersion_kioskConfigurationId_version_key" ON "KioskConfigurationContentVersion"("kioskConfigurationId", "version");
