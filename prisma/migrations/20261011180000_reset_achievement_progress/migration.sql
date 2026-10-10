-- Milestone thresholds were raised; clear stored progress (and its rarity) so every tier is recomputed from the stored games.
DELETE FROM "AchievementProgress";
DELETE FROM "AppSettings" WHERE "key" = 'achievement-rarity';
