-- CreateTable
CREATE TABLE "PoliceLocation" (
    "id" TEXT NOT NULL,
    "policeOfficerId" TEXT NOT NULL,
    "dispatchId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoliceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoliceLocation_policeOfficerId_idx" ON "PoliceLocation"("policeOfficerId");

-- CreateIndex
CREATE INDEX "PoliceLocation_dispatchId_idx" ON "PoliceLocation"("dispatchId");

-- CreateIndex
CREATE INDEX "PoliceLocation_isActive_idx" ON "PoliceLocation"("isActive");

-- CreateIndex
CREATE INDEX "PoliceLocation_recordedAt_idx" ON "PoliceLocation"("recordedAt");

-- CreateIndex
CREATE INDEX "PoliceLocation_policeOfficerId_dispatchId_isActive_idx" ON "PoliceLocation"("policeOfficerId", "dispatchId", "isActive");

-- AddForeignKey
ALTER TABLE "PoliceLocation" ADD CONSTRAINT "PoliceLocation_policeOfficerId_fkey" FOREIGN KEY ("policeOfficerId") REFERENCES "PoliceOfficer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceLocation" ADD CONSTRAINT "PoliceLocation_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
