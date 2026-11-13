-- Unused: lookups by matchId use the (matchId, puuid, badgeId) unique index
DROP INDEX IF EXISTS "MatchBadge_matchId_idx";
DROP INDEX IF EXISTS "MatchBadge_puuid_idx";
