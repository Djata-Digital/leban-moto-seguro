-- AlterTable
ALTER TABLE "GpsDevice"
ADD COLUMN "iccid" TEXT,
ADD COLUMN "apn" TEXT,
ADD COLUMN "firmwareVersion" TEXT,
ADD COLUMN "lastCommunicationAt" TIMESTAMP(3),
ADD COLUMN "batteryLevel" DOUBLE PRECISION,
ADD COLUMN "signalStrength" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "GpsDevice_iccid_key" ON "GpsDevice"("iccid");

-- CreateIndex
CREATE INDEX "GpsDevice_motorcycleId_isActive_idx" ON "GpsDevice"("motorcycleId", "isActive");

-- CreateIndex
CREATE INDEX "GpsDevice_lastCommunicationAt_idx" ON "GpsDevice"("lastCommunicationAt");
