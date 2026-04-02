-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerAchievement_puuid_idx" ON "PlayerAchievement"("puuid");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_puuid_achievementId_key" ON "PlayerAchievement"("puuid", "achievementId");

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Account"("puuid") ON DELETE RESTRICT ON UPDATE CASCADE;
