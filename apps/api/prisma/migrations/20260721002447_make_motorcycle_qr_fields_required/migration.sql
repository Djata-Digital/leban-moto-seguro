/*
  Warnings:

  - Made the column `nationalCode` on table `Motorcycle` required. This step will fail if there are existing NULL values in that column.
  - Made the column `qrToken` on table `Motorcycle` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Motorcycle" ALTER COLUMN "nationalCode" SET NOT NULL,
ALTER COLUMN "qrToken" SET NOT NULL;
