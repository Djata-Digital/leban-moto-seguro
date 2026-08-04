ALTER TABLE "TheftReport"
ADD COLUMN "occurredAt" TIMESTAMP(3),
ADD COLUMN "driverName" TEXT,
ADD COLUMN "contactPhone" TEXT;

CREATE TABLE "TheftReportAttachment" (
  "id" TEXT NOT NULL,
  "theftReportId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TheftReportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TheftReportEvent" (
  "id" TEXT NOT NULL,
  "theftReportId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "actorUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TheftReportEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TheftReportAttachment_theftReportId_idx"
ON "TheftReportAttachment"("theftReportId");

CREATE INDEX "TheftReportEvent_theftReportId_createdAt_idx"
ON "TheftReportEvent"("theftReportId", "createdAt");

ALTER TABLE "TheftReportAttachment"
ADD CONSTRAINT "TheftReportAttachment_theftReportId_fkey"
FOREIGN KEY ("theftReportId") REFERENCES "TheftReport"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TheftReportEvent"
ADD CONSTRAINT "TheftReportEvent_theftReportId_fkey"
FOREIGN KEY ("theftReportId") REFERENCES "TheftReport"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
