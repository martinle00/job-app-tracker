-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "source" TEXT,
    "location" TEXT,
    "workType" TEXT,
    "jobUrl" TEXT,
    "appliedDate" DATETIME,
    "closingDate" DATETIME,
    "lastActivity" DATETIME,
    "furthestStage" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("appliedDate", "company", "createdAt", "furthestStage", "id", "jobUrl", "lastActivity", "location", "notes", "outcome", "personId", "role", "source", "updatedAt", "workType") SELECT "appliedDate", "company", "createdAt", "furthestStage", "id", "jobUrl", "lastActivity", "location", "notes", "outcome", "personId", "role", "source", "updatedAt", "workType" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE INDEX "Application_personId_idx" ON "Application"("personId");
CREATE INDEX "Application_appliedDate_idx" ON "Application"("appliedDate");
CREATE UNIQUE INDEX "Application_personId_company_role_key" ON "Application"("personId", "company", "role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
