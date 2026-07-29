-- CreateEnum
CREATE TYPE "MotorcycleCondition" AS ENUM ('INTACT', 'DAMAGED', 'DISMANTLED', 'ABANDONED', 'BURNED', 'OTHER');

-- CreateTable
CREATE TABLE "RecoveryReport" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "policeOfficerId" TEXT,
    "motorcycleCondition" "MotorcycleCondition" NOT NULL,
    "detailedReport" TEXT NOT NULL,
    "policeReportNumber" TEXT,
    "keyFound" BOOLEAN NOT NULL DEFAULT false,
    "arrestOccurred" BOOLEAN NOT NULL DEFAULT false,
    "suspectsCount" INTEGER NOT NULL DEFAULT 0,
    "confrontation" BOOLEAN NOT NULL DEFAULT false,
    "injuredPeople" BOOLEAN NOT NULL DEFAULT false,
    "ownerPresent" BOOLEAN NOT NULL DEFAULT false,
    "recoveredObjects" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryReport_dispatchId_key" ON "RecoveryReport"("dispatchId");

-- CreateIndex
CREATE INDEX "RecoveryReport_policeOfficerId_idx" ON "RecoveryReport"("policeOfficerId");

-- CreateIndex
CREATE INDEX "RecoveryReport_completedAt_idx" ON "RecoveryReport"("completedAt");

-- AddForeignKey
ALTER TABLE "RecoveryReport" ADD CONSTRAINT "RecoveryReport_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryReport" ADD CONSTRAINT "RecoveryReport_policeOfficerId_fkey" FOREIGN KEY ("policeOfficerId") REFERENCES "PoliceOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
