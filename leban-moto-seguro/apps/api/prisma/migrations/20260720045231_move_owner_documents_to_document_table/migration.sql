/*
  Warnings:

  - You are about to drop the column `identityDocumentUrl` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseDocumentUrl` on the `Owner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Owner" DROP COLUMN "identityDocumentUrl",
DROP COLUMN "purchaseDocumentUrl";
