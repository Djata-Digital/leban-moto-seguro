/*
  Warnings:

  - A unique constraint covering the columns `[nationalCode]` on the table `Motorcycle` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrToken]` on the table `Motorcycle` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Motorcycle" ADD COLUMN     "nationalCode" TEXT,
ADD COLUMN     "qrToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Motorcycle_nationalCode_key" ON "Motorcycle"("nationalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Motorcycle_qrToken_key" ON "Motorcycle"("qrToken");
