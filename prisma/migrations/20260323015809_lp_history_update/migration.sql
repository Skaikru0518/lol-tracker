/*
  Warnings:

  - A unique constraint covering the columns `[puuid,queueType,matchId]` on the table `LPHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LPHistory" ADD COLUMN     "losses" INTEGER,
ADD COLUMN     "matchId" TEXT,
ADD COLUMN     "wins" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "LPHistory_puuid_queueType_matchId_key" ON "LPHistory"("puuid", "queueType", "matchId");
