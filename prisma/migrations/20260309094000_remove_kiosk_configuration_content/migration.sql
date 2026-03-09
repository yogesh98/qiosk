PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_KioskConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "currentVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "KioskConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KioskConfiguration_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "KioskConfigurationVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_KioskConfiguration" (
    "id",
    "name",
    "width",
    "height",
    "currentVersionId",
    "createdAt",
    "updatedAt",
    "createdById"
)
SELECT
    "id",
    "name",
    "width",
    "height",
    "currentVersionId",
    "createdAt",
    "updatedAt",
    "createdById"
FROM "KioskConfiguration";

DROP TABLE "KioskConfiguration";
ALTER TABLE "new_KioskConfiguration" RENAME TO "KioskConfiguration";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
