-- CreateTable
CREATE TABLE "Account" (
    "puuid" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("puuid")
);

-- CreateTable
CREATE TABLE "Summoner" (
    "puuid" TEXT NOT NULL,
    "profileIconId" INTEGER NOT NULL,
    "summonerLevel" INTEGER NOT NULL,
    "revisionDate" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Summoner_pkey" PRIMARY KEY ("puuid")
);

-- CreateTable
CREATE TABLE "RankedEntry" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "leaguePoints" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "hotStreak" BOOLEAN NOT NULL DEFAULT false,
    "veteran" BOOLEAN NOT NULL DEFAULT false,
    "freshBlood" BOOLEAN NOT NULL DEFAULT false,
    "inactive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "matchId" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "gameCreation" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("matchId")
);

-- CreateTable
CREATE TABLE "MatchTimeline" (
    "matchId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchTimeline_pkey" PRIMARY KEY ("matchId")
);

-- CreateTable
CREATE TABLE "ChampionMastery" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championLevel" INTEGER NOT NULL,
    "championPoints" INTEGER NOT NULL,
    "lastPlayTime" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPHistory" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "lp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LPHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_gameName_tagLine_idx" ON "Account"("gameName", "tagLine");

-- CreateIndex
CREATE INDEX "RankedEntry_puuid_idx" ON "RankedEntry"("puuid");

-- CreateIndex
CREATE UNIQUE INDEX "RankedEntry_puuid_queueType_key" ON "RankedEntry"("puuid", "queueType");

-- CreateIndex
CREATE INDEX "ChampionMastery_puuid_idx" ON "ChampionMastery"("puuid");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionMastery_puuid_championId_key" ON "ChampionMastery"("puuid", "championId");

-- CreateIndex
CREATE INDEX "LPHistory_puuid_queueType_idx" ON "LPHistory"("puuid", "queueType");

-- AddForeignKey
ALTER TABLE "Summoner" ADD CONSTRAINT "Summoner_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Account"("puuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedEntry" ADD CONSTRAINT "RankedEntry_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Account"("puuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTimeline" ADD CONSTRAINT "MatchTimeline_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("matchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionMastery" ADD CONSTRAINT "ChampionMastery_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Account"("puuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPHistory" ADD CONSTRAINT "LPHistory_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Account"("puuid") ON DELETE RESTRICT ON UPDATE CASCADE;
