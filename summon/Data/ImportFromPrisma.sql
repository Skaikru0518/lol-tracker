-- Copies the Next.js app's data (Prisma tables) into this app's tables in the "dotnet" schema.
-- Run after `dotnet ef database update` has created the dotnet tables. One transaction; it empties the dotnet tables
-- first, so it can be run again. The source schema is the search_path line below: public where the Prisma tables live.
-- Prisma stores timestamps as UTC without a time zone; they become timestamptz here.

-- One snapshot for every statement: the Next.js app keeps writing meanwhile, and a row added between two statements
-- (a new account's ranked entry) would otherwise miss its parent row
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL search_path = public;

TRUNCATE dotnet."Accounts", dotnet."RankedEntries", dotnet."LpSnapshots", dotnet."Summoners", dotnet."ChampionMasteries",
    dotnet."PlayerAchievements", dotnet."AchievementProgress", dotnet."MatchBadges", dotnet."AppSettings", dotnet."Matches",
    dotnet."MatchParticipants", dotnet."MatchTimelines", dotnet."MatchPerformances", dotnet."PerformanceBaselines"
    RESTART IDENTITY;

-- Prisma stores the platform key (eune), this app the Riot host (eun1)
INSERT INTO dotnet."Accounts" ("Puuid", "GameName", "TagLine", "Platform", "UpdatedAt")
SELECT puuid, "gameName", "tagLine",
    CASE platform WHEN 'eune' THEN 'eun1' WHEN 'euw' THEN 'euw1' ELSE platform END,
    "updatedAt" AT TIME ZONE 'UTC'
FROM "Account";

INSERT INTO dotnet."Summoners" ("Puuid", "ProfileIconId", "SummonerLevel", "UpdatedAt")
SELECT puuid, "profileIconId", "summonerLevel", "updatedAt" AT TIME ZONE 'UTC'
FROM "Summoner";

INSERT INTO dotnet."RankedEntries" ("Puuid", "QueueType", "Tier", "Rank", "LeaguePoints", "Wins", "Losses", "UpdatedAt")
SELECT puuid, "queueType", tier, rank, "leaguePoints", wins, losses, "updatedAt" AT TIME ZONE 'UTC'
FROM "RankedEntry";

-- Ids are new; inserted oldest first so they keep the original order
INSERT INTO dotnet."LpSnapshots" ("Puuid", "QueueType", "Tier", "Rank", "Lp", "Wins", "Losses", "CreatedAt")
SELECT puuid, "queueType", tier, rank, lp, wins, losses, "createdAt" AT TIME ZONE 'UTC'
FROM "LPHistory"
ORDER BY "createdAt", id;

INSERT INTO dotnet."ChampionMasteries" ("Puuid", "ChampionId", "ChampionLevel", "ChampionPoints", "UpdatedAt")
SELECT puuid, "championId", "championLevel", "championPoints", "updatedAt" AT TIME ZONE 'UTC'
FROM "ChampionMastery";

INSERT INTO dotnet."PlayerAchievements" ("Puuid", "AchievementId", "EarnedAt")
SELECT puuid, "achievementId", "earnedAt" AT TIME ZONE 'UTC'
FROM "PlayerAchievement";

INSERT INTO dotnet."AchievementProgress" ("Puuid", "AchievementId", "Scope", "Value", "Tier", "ReachedAt", "UpdatedAt")
SELECT puuid, "achievementId", scope, value, tier,
    ARRAY(SELECT r.at AT TIME ZONE 'UTC' FROM unnest("reachedAt") WITH ORDINALITY AS r(at, i) ORDER BY r.i),
    "updatedAt" AT TIME ZONE 'UTC'
FROM "AchievementProgress";

INSERT INTO dotnet."MatchBadges" ("MatchId", "Puuid", "BadgeId")
SELECT "matchId", puuid, "badgeId"
FROM "MatchBadge";

INSERT INTO dotnet."AppSettings" ("Key", "Value", "UpdatedAt")
SELECT key, value, "updatedAt" AT TIME ZONE 'UTC'
FROM "AppSettings";

INSERT INTO dotnet."Matches" ("MatchId", "QueueId", "GameCreation", "GameDuration", "Data", "CreatedAt")
SELECT "matchId", "queueId", "gameCreation", "gameDuration", data, "updatedAt" AT TIME ZONE 'UTC'
FROM "Match";

-- One row per player, built from the match document like MatchService does; bot games share a puuid, so only one is kept
INSERT INTO dotnet."MatchParticipants" ("MatchId", "Puuid", "ChampionName", "Win", "Kills", "Deaths", "Assists", "Cs", "Items",
    "Spell1", "Spell2", "ChampLevel", "Keystone", "SecondaryStyle", "Placement")
SELECT DISTINCT ON (m."matchId", p->>'puuid')
    m."matchId",
    p->>'puuid',
    coalesce(p->>'championName', ''),
    coalesce((p->>'win')::boolean, false),
    coalesce((p->>'kills')::int, 0),
    coalesce((p->>'deaths')::int, 0),
    coalesce((p->>'assists')::int, 0),
    coalesce((p->>'totalMinionsKilled')::int, 0) + coalesce((p->>'neutralMinionsKilled')::int, 0),
    ARRAY[coalesce((p->>'item0')::int, 0), coalesce((p->>'item1')::int, 0), coalesce((p->>'item2')::int, 0), coalesce((p->>'item3')::int, 0),
          coalesce((p->>'item4')::int, 0), coalesce((p->>'item5')::int, 0), coalesce((p->>'item6')::int, 0)],
    coalesce((p->>'summoner1Id')::int, 0),
    coalesce((p->>'summoner2Id')::int, 0),
    coalesce((p->>'champLevel')::int, 0),
    coalesce((p->'perks'->'styles'->0->'selections'->0->>'perk')::int, 0),
    coalesce((p->'perks'->'styles'->1->>'style')::int, 0),
    (p->>'placement')::int
FROM "Match" m, jsonb_array_elements(m.data->'info'->'participants') p
WHERE p->>'puuid' IS NOT NULL
ORDER BY m."matchId", p->>'puuid';

INSERT INTO dotnet."MatchTimelines" ("MatchId", "Data", "UpdatedAt")
SELECT "matchId", data, "updatedAt" AT TIME ZONE 'UTC'
FROM "MatchTimeline";

INSERT INTO dotnet."MatchPerformances" ("MatchId", "Data", "Summary", "CreatedAt")
SELECT "matchId", data, summary, "createdAt" AT TIME ZONE 'UTC'
FROM "MatchPerformance";

INSERT INTO dotnet."PerformanceBaselines" ("ComputedAt", "SampleSize", "Data")
SELECT "computedAt" AT TIME ZONE 'UTC', "sampleSize", data
FROM "PerformanceBaseline"
ORDER BY "computedAt";

COMMIT;
