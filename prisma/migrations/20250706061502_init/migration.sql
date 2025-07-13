-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MAHASISWA', 'DOSEN', 'ADMIN');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PUBLISHED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MenuType" AS ENUM ('INTERNAL', 'EXTERNAL', 'STATIC_PATH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MAHASISWA',
    "userCode" TEXT NOT NULL,
    "studyProgram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "studyProgram" TEXT NOT NULL,
    "abstract" TEXT,
    "keywords" TEXT,
    "advisor" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'PRIVATE',
    "publishedAt" TIMESTAMP(3),
    "showDownloadsToPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileItem" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "repositoryItemId" TEXT NOT NULL,

    CONSTRAINT "FileItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "blocks" JSONB,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MenuType" NOT NULL DEFAULT 'INTERNAL',
    "href" TEXT,
    "postId" TEXT,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubMenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "MenuType" NOT NULL DEFAULT 'INTERNAL',
    "href" TEXT,
    "postId" TEXT,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "SubMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_name_key" ON "MenuItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_postId_key" ON "MenuItem"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SubMenuItem_postId_key" ON "SubMenuItem"("postId");

-- AddForeignKey
ALTER TABLE "RepositoryItem" ADD CONSTRAINT "RepositoryItem_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileItem" ADD CONSTRAINT "FileItem_repositoryItemId_fkey" FOREIGN KEY ("repositoryItemId") REFERENCES "RepositoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubMenuItem" ADD CONSTRAINT "SubMenuItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubMenuItem" ADD CONSTRAINT "SubMenuItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
