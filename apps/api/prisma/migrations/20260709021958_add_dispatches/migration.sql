-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "alertId" TEXT,
    "motorcycleId" TEXT,
    "policeOfficerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "DispatchPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "DispatchStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_code_key" ON "Dispatch"("code");

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_policeOfficerId_fkey" FOREIGN KEY ("policeOfficerId") REFERENCES "PoliceOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
