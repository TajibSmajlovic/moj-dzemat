-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Question_answer_isHidden_answeredAt_idx" ON "Question"("answer", "isHidden", "answeredAt");

-- CreateIndex
CREATE INDEX "Question_answer_createdAt_idx" ON "Question"("answer", "createdAt");

-- CreateIndex
CREATE INDEX "Question_answeredAt_idx" ON "Question"("answeredAt");
