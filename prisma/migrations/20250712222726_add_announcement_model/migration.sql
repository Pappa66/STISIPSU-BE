-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('PUBLIC', 'MAHASISWA', 'DOSEN');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('TEXT', 'IMAGE');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "targetAudiences" "Audience"[],
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);
