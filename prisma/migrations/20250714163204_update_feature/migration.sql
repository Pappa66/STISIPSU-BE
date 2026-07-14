/*
  Warnings:

  - You are about to drop the column `targetAudiences` on the `Announcement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "targetAudiences";

-- AlterTable
ALTER TABLE "GalleryImage" ADD COLUMN     "postId" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropEnum
DROP TYPE "Audience";

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
