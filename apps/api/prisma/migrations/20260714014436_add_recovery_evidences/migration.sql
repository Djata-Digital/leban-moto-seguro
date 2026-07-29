-- CreateEnum
CREATE TYPE "RecoveryEvidenceType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'AUDIO');

-- CreateTable
CREATE TABLE "RecoveryEvidence" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "policeOfficerId" TEXT,
    "type" "RecoveryEvidenceType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "notes" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecoveryEvidence_dispatchId_idx" ON "RecoveryEvidence"("dispatchId");

-- CreateIndex
CREATE INDEX "RecoveryEvidence_policeOfficerId_idx" ON "RecoveryEvidence"("policeOfficerId");

-- CreateIndex
CREATE INDEX "RecoveryEvidence_type_idx" ON "RecoveryEvidence"("type");

-- CreateIndex
CREATE INDEX "RecoveryEvidence_createdAt_idx" ON "RecoveryEvidence"("createdAt");

-- AddForeignKey
ALTER TABLE "RecoveryEvidence" ADD CONSTRAINT "RecoveryEvidence_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryEvidence" ADD CONSTRAINT "RecoveryEvidence_policeOfficerId_fkey" FOREIGN KEY ("policeOfficerId") REFERENCES "PoliceOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
