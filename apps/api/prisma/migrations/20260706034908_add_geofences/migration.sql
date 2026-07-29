-- CreateEnum
CREATE TYPE "GeofenceType" AS ENUM ('ALLOWED_AREA', 'RESTRICTED_AREA', 'WARNING_AREA');

-- CreateEnum
CREATE TYPE "GeofenceShape" AS ENUM ('CIRCLE');

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GeofenceType" NOT NULL,
    "shape" "GeofenceShape" NOT NULL DEFAULT 'CIRCLE',
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
