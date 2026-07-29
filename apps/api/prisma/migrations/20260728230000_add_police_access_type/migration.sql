-- CreateEnum
CREATE TYPE "PoliceAccessType" AS ENUM ('PATROL', 'OPERATIONS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "policeAccessType" "PoliceAccessType";

-- Existing users linked to PoliceOfficer are operational police users.
UPDATE "User" AS u
SET "policeAccessType" = 'OPERATIONS',
    "status" = 'ACTIVE'
WHERE EXISTS (
  SELECT 1
  FROM "PoliceOfficer" AS p
  WHERE p."userId" = u."id"
);

-- Other existing POLICIA users remain road-inspection users.
UPDATE "User"
SET "policeAccessType" = 'PATROL'
WHERE "role" = 'POLICIA'
  AND "policeAccessType" IS NULL;
