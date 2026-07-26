/*
  Warnings:

  - You are about to drop the column `content` on the `PromptVersion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PromptVersion" DROP COLUMN "content",
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "systemPrompt" TEXT,
ADD COLUMN     "userPrompt" TEXT;
