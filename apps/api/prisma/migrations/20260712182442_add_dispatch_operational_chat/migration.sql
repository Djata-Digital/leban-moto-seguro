-- CreateEnum
CREATE TYPE "DispatchMessageSenderType" AS ENUM ('CENTRAL', 'POLICE', 'SYSTEM');

-- CreateTable
CREATE TABLE "DispatchMessage" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderType" "DispatchMessageSenderType" NOT NULL,
    "message" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchMessage_dispatchId_idx" ON "DispatchMessage"("dispatchId");

-- CreateIndex
CREATE INDEX "DispatchMessage_senderId_idx" ON "DispatchMessage"("senderId");

-- CreateIndex
CREATE INDEX "DispatchMessage_isRead_idx" ON "DispatchMessage"("isRead");

-- CreateIndex
CREATE INDEX "DispatchMessage_createdAt_idx" ON "DispatchMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "DispatchMessage" ADD CONSTRAINT "DispatchMessage_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchMessage" ADD CONSTRAINT "DispatchMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
