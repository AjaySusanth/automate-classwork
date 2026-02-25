/*
  Warnings:

  - You are about to drop the column `content` on the `Submission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "content",
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUrl" TEXT;
