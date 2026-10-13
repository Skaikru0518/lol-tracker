-- CreateTable
CREATE TABLE "PerformanceBaseline" (
    "id" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleSize" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "PerformanceBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceBaseline_computedAt_idx" ON "PerformanceBaseline"("computedAt");
