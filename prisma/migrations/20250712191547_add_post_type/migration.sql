-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('PAGE', 'NEWS');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'PAGE';
