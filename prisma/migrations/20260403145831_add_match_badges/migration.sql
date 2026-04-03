-- CreateTable
CREATE TABLE "MatchBadge" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,

    CONSTRAINT "MatchBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchBadge_matchId_idx" ON "MatchBadge"("matchId");

-- CreateIndex
CREATE INDEX "MatchBadge_puuid_idx" ON "MatchBadge"("puuid");

-- CreateIndex
CREATE UNIQUE INDEX "MatchBadge_matchId_puuid_badgeId_key" ON "MatchBadge"("matchId", "puuid", "badgeId");
