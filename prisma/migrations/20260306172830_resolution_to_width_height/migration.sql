/*
  Warnings:

  - You are about to drop the column `resolution` on the `KioskConfiguration` table. All the data in the column will be lost.
  - Added the required column `height` to the `KioskConfiguration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `KioskConfiguration` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KioskConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "KioskConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_KioskConfiguration" ("createdAt", "createdById", "id", "name", "updatedAt") SELECT "createdAt", "createdById", "id", "name", "updatedAt" FROM "KioskConfiguration";
DROP TABLE "KioskConfiguration";
ALTER TABLE "new_KioskConfiguration" RENAME TO "KioskConfiguration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
