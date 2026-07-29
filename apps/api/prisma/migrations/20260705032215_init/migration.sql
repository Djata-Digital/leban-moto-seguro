-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERADOR', 'PROPRIETARIO', 'MOTORISTA', 'POLICIA', 'SUPERVISOR_POLICIA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MotorcycleType" AS ENUM ('PARTICULAR', 'MOTO_TAXI');

-- CreateEnum
CREATE TYPE "MotorcycleStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'STOLEN', 'ROBBED', 'RECOVERED', 'INVESTIGATION', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IDENTITY', 'PURCHASE_PROOF', 'RESIDENCE_PROOF', 'DRIVING_LICENSE', 'MOTORCYCLE_REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TheftReportType" AS ENUM ('FURTO', 'ROUBO', 'DESAPARECIDA');

-- CreateEnum
CREATE TYPE "TheftReportStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RECOVERED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "identityNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "nationality" TEXT,
    "country" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "identityNumber" TEXT,
    "drivingLicenseNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "nationality" TEXT,
    "country" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliceOfficer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "identityNumber" TEXT,
    "badgeNumber" TEXT,
    "stationName" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliceOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motorcycle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "MotorcycleType" NOT NULL,
    "status" "MotorcycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "color" TEXT,
    "chassisNumber" TEXT NOT NULL,
    "engineNumber" TEXT,
    "plateNumber" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motorcycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverMotorcycleLink" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverMotorcycleLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotorcycleRoute" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originZone" TEXT,
    "destinationZone" TEXT,
    "allowedAreas" TEXT[],
    "allowedDays" TEXT[],
    "startTime" TEXT,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorcycleRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteAuthorization" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "routeId" TEXT,
    "requestedDestination" TEXT NOT NULL,
    "reason" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "ownerDecisionNote" TEXT,
    "qrCodeData" TEXT,
    "verificationCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliceCheck" (
    "id" TEXT NOT NULL,
    "policeOfficerId" TEXT NOT NULL,
    "motorcycleId" TEXT,
    "plateNumber" TEXT,
    "chassisNumber" TEXT,
    "locationText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "result" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoliceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TheftReport" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "type" "TheftReportType" NOT NULL,
    "status" "TheftReportStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "reportNumber" TEXT,
    "locationText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TheftReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsDevice" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "simNumber" TEXT,
    "provider" TEXT,
    "deviceModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasBackupBattery" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsLocation" (
    "id" TEXT NOT NULL,
    "gpsDeviceId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "battery" DOUBLE PRECISION,
    "ignitionOn" BOOLEAN,
    "signalLevel" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerDocument" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotorcycleDocument" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotorcycleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_userId_key" ON "Owner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PoliceOfficer_userId_key" ON "PoliceOfficer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Motorcycle_chassisNumber_key" ON "Motorcycle"("chassisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Motorcycle_engineNumber_key" ON "Motorcycle"("engineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Motorcycle_plateNumber_key" ON "Motorcycle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DriverMotorcycleLink_driverId_motorcycleId_key" ON "DriverMotorcycleLink"("driverId", "motorcycleId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteAuthorization_verificationCode_key" ON "RouteAuthorization"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "GpsDevice_imei_key" ON "GpsDevice"("imei");

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceOfficer" ADD CONSTRAINT "PoliceOfficer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motorcycle" ADD CONSTRAINT "Motorcycle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverMotorcycleLink" ADD CONSTRAINT "DriverMotorcycleLink_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverMotorcycleLink" ADD CONSTRAINT "DriverMotorcycleLink_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotorcycleRoute" ADD CONSTRAINT "MotorcycleRoute_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAuthorization" ADD CONSTRAINT "RouteAuthorization_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAuthorization" ADD CONSTRAINT "RouteAuthorization_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAuthorization" ADD CONSTRAINT "RouteAuthorization_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "MotorcycleRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceCheck" ADD CONSTRAINT "PoliceCheck_policeOfficerId_fkey" FOREIGN KEY ("policeOfficerId") REFERENCES "PoliceOfficer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceCheck" ADD CONSTRAINT "PoliceCheck_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheftReport" ADD CONSTRAINT "TheftReport_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsDevice" ADD CONSTRAINT "GpsDevice_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsLocation" ADD CONSTRAINT "GpsLocation_gpsDeviceId_fkey" FOREIGN KEY ("gpsDeviceId") REFERENCES "GpsDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerDocument" ADD CONSTRAINT "OwnerDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotorcycleDocument" ADD CONSTRAINT "MotorcycleDocument_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
