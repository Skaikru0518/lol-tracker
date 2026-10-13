-- CreateTable
CREATE TABLE "MatchPerformance" (
    "matchId" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchPerformance_pkey" PRIMARY KEY ("matchId")
);
