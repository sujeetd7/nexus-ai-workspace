-- AlterTable
ALTER TABLE "PromptExecution" ADD COLUMN     "error" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SUCCESS';
