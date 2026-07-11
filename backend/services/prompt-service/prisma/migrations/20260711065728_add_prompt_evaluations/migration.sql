-- CreateTable
CREATE TABLE "PromptEvaluation" (
    "id" TEXT NOT NULL,
    "promptVersionId" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "evaluator" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "passedCases" INTEGER NOT NULL,
    "failedCases" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptEvaluationResult" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expected" JSONB,
    "actual" JSONB,
    "passed" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "latency" INTEGER,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptEvaluationResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PromptEvaluation" ADD CONSTRAINT "PromptEvaluation_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptEvaluationResult" ADD CONSTRAINT "PromptEvaluationResult_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PromptEvaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
