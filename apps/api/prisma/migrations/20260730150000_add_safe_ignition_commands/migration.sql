CREATE TYPE "IgnitionCommandType" AS ENUM ('BLOCK_NEXT_START', 'SAFE_SHUTDOWN', 'UNBLOCK');
CREATE TYPE "IgnitionCommandStatus" AS ENUM ('REQUESTED', 'WAITING_FOR_DEVICE', 'WAITING_FOR_STOP', 'SENT', 'CONFIRMED', 'FAILED', 'CANCELLED', 'EXPIRED');
CREATE TABLE "IgnitionCommand" (
  "id" TEXT NOT NULL,
  "motorcycleId" TEXT NOT NULL,
  "gpsDeviceId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "type" "IgnitionCommandType" NOT NULL,
  "status" "IgnitionCommandStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT NOT NULL,
  "incidentNumber" TEXT,
  "requestedSpeed" DOUBLE PRECISION,
  "requestedLatitude" DOUBLE PRECISION,
  "requestedLongitude" DOUBLE PRECISION,
  "deviceResponse" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "IgnitionCommand_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IgnitionCommand_motorcycleId_requestedAt_idx" ON "IgnitionCommand"("motorcycleId", "requestedAt");
CREATE INDEX "IgnitionCommand_gpsDeviceId_status_idx" ON "IgnitionCommand"("gpsDeviceId", "status");
ALTER TABLE "IgnitionCommand" ADD CONSTRAINT "IgnitionCommand_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IgnitionCommand" ADD CONSTRAINT "IgnitionCommand_gpsDeviceId_fkey" FOREIGN KEY ("gpsDeviceId") REFERENCES "GpsDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IgnitionCommand" ADD CONSTRAINT "IgnitionCommand_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
