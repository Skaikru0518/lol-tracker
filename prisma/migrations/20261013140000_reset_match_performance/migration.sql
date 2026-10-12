-- Scores are now calibrated; clear cached ones so every game is scored again
DELETE FROM "MatchPerformance";
