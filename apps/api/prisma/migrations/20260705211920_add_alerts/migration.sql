-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('THEFT_GPS_SIGNAL', 'LOW_GPS_BATTERY', 'GPS_NO_SIGNAL', 'MOTORCYCLE_OUT_OF_ROUTE', 'UNAUTHORIZED_DRIVER', 'AUTHORIZATION_EXPIRED', 'GPS_DEVICE_REMOVED', 'MANUAL_ALERT');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "motorcycleId" TEXT,
    "gpsDeviceId" TEXT,
    "theftReportId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_gpsDeviceId_fkey" FOREIGN KEY ("gpsDeviceId") REFERENCES "GpsDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_theftReportId_fkey" FOREIGN KEY ("theftReportId") REFERENCES "TheftReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
