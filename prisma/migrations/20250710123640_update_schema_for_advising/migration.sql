/*
  Warnings:

  - You are about to drop the column `advisor` on the `RepositoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `RepositoryItem` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('PUBLISHED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "RepositoryItem" DROP CONSTRAINT "RepositoryItem_uploaderId_fkey";

-- AlterTable
ALTER TABLE "RepositoryItem" DROP COLUMN "advisor",
DROP COLUMN "status",
ADD COLUMN     "advisorId" TEXT,
ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "visibility" "VisibilityStatus" NOT NULL DEFAULT 'PRIVATE';

-- DropEnum
DROP TYPE "PublishStatus";

-- CreateTable
CREATE TABLE "Bimbingan" (
    "id" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bimbingan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bimbingan_dosenId_mahasiswaId_key" ON "Bimbingan"("dosenId", "mahasiswaId");

-- AddForeignKey
ALTER TABLE "Bimbingan" ADD CONSTRAINT "Bimbingan_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bimbingan" ADD CONSTRAINT "Bimbingan_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryItem" ADD CONSTRAINT "RepositoryItem_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryItem" ADD CONSTRAINT "RepositoryItem_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
