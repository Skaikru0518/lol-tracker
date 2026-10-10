-- CreateTable
CREATE TABLE "AchievementProgress" (
    "puuid" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL,
    "reachedAt" TIMESTAMP(3)[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievementProgress_pkey" PRIMARY KEY ("puuid","achievementId","scope")
);

-- CreateIndex
CREATE INDEX "AchievementProgress_achievementId_scope_tier_idx" ON "AchievementProgress"("achievementId", "scope", "tier");

-- AddForeignKey
ALTER TABLE "AchievementProgress" ADD CONSTRAINT "AchievementProgress_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Account"("puuid") ON DELETE RESTRICT ON UPDATE CASCADE;
