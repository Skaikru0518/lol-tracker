/*
  Warnings:

  - You are about to drop the column `matchId` on the `LPHistory` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LPHistory_puuid_queueType_matchId_key";

-- AlterTable
ALTER TABLE "LPHistory" DROP COLUMN "matchId";
