-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "totalMark" INTEGER;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "gradedAt" TIMESTAMP(3);
