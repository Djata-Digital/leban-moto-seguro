-- CreateEnum
CREATE TYPE "DispatchEventType" AS ENUM ('CREATED', 'ASSIGNED', 'ACCEPTED', 'ON_ROUTE', 'ARRIVED', 'SEARCHING', 'RECOVERED', 'RESOLVED', 'CANCELLED', 'NOTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DispatchStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "DispatchStatus" ADD VALUE 'ON_ROUTE';
ALTER TYPE "DispatchStatus" ADD VALUE 'ARRIVED';
ALTER TYPE "DispatchStatus" ADD VALUE 'SEARCHING';
ALTER TYPE "DispatchStatus" ADD VALUE 'RECOVERED';

-- AlterTable
ALTER TABLE "Dispatch" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "onRouteAt" TIMESTAMP(3),
ADD COLUMN     "recoveredAt" TIMESTAMP(3),
ADD COLUMN     "searchingAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DispatchEvent" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "type" "DispatchEventType" NOT NULL,
    "status" "DispatchStatus",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchEvent_dispatchId_idx" ON "DispatchEvent"("dispatchId");

-- CreateIndex
CREATE INDEX "DispatchEvent_type_idx" ON "DispatchEvent"("type");

-- CreateIndex
CREATE INDEX "DispatchEvent_createdAt_idx" ON "DispatchEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "DispatchEvent" ADD CONSTRAINT "DispatchEvent_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
