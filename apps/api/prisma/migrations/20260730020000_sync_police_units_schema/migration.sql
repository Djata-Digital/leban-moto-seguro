-- CreateEnum
CREATE TYPE "PoliceOfficerOperationalStatus" AS ENUM (
  'DISPONIVEL',
  'EM_MISSAO',
  'DE_FOLGA',
  'INATIVO'
);

-- CreateEnum
CREATE TYPE "PoliceUnitType" AS ENUM (
  'ESQUADRA',
  'GUARDA_NACIONAL',
  'POLICIA_TRANSITO',
  'POLICIA_JUDICIARIA',
  'GUARDA_COSTEIRA'
);

-- CreateTable
CREATE TABLE "PoliceUnit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PoliceUnitType" NOT NULL,
  "city" TEXT NOT NULL,
  "neighborhood" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PoliceUnit_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Dispatch
ALTER TABLE "Dispatch"
ADD COLUMN "policeUnitId" TEXT,
ADD COLUMN "serviceDescription" TEXT,
ADD COLUMN "vehicleRecovered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "arrestMade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "completionNotes" TEXT;

-- AlterTable: PoliceOfficer
ALTER TABLE "PoliceOfficer"
ADD COLUMN "rank" TEXT,
ADD COLUMN "function" TEXT,
ADD COLUMN "operationalStatus" "PoliceOfficerOperationalStatus" NOT NULL DEFAULT 'DISPONIVEL',
ADD COLUMN "policeUnitId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PoliceUnit_userId_key"
ON "PoliceUnit"("userId");

-- CreateIndex
CREATE INDEX "Dispatch_policeOfficerId_status_idx"
ON "Dispatch"("policeOfficerId", "status");

-- CreateIndex
CREATE INDEX "Dispatch_policeUnitId_idx"
ON "Dispatch"("policeUnitId");

-- CreateIndex
CREATE INDEX "Dispatch_policeUnitId_status_idx"
ON "Dispatch"("policeUnitId", "status");

-- CreateIndex
CREATE INDEX "PoliceOfficer_operationalStatus_idx"
ON "PoliceOfficer"("operationalStatus");

-- CreateIndex
CREATE INDEX "PoliceOfficer_policeUnitId_idx"
ON "PoliceOfficer"("policeUnitId");

-- AddForeignKey
ALTER TABLE "PoliceUnit"
ADD CONSTRAINT "PoliceUnit_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch"
ADD CONSTRAINT "Dispatch_policeUnitId_fkey"
FOREIGN KEY ("policeUnitId")
REFERENCES "PoliceUnit"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceOfficer"
ADD CONSTRAINT "PoliceOfficer_policeUnitId_fkey"
FOREIGN KEY ("policeUnitId")
REFERENCES "PoliceUnit"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
