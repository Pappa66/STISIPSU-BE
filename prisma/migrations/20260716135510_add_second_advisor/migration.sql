-- AlterTable
ALTER TABLE "RepositoryItem" ADD COLUMN     "secondAdvisorId" TEXT;

-- AddForeignKey
ALTER TABLE "RepositoryItem" ADD CONSTRAINT "RepositoryItem_secondAdvisorId_fkey" FOREIGN KEY ("secondAdvisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
