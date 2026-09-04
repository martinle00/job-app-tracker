-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "source" TEXT,
    "location" TEXT,
    "workType" TEXT,
    "jobUrl" TEXT,
    "appliedDate" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3),
    "furthestStage" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_key" ON "Person"("name");

-- CreateIndex
CREATE INDEX "Application_personId_idx" ON "Application"("personId");

-- CreateIndex
CREATE INDEX "Application_appliedDate_idx" ON "Application"("appliedDate");

-- CreateIndex
CREATE UNIQUE INDEX "Application_personId_company_role_key" ON "Application"("personId", "company", "role");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
