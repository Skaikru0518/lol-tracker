-- Achievement detection looks up every match a given puuid played in. That
-- lookup was a sequential scan over the whole "Match" table (855 ms and ~287 MB
-- of buffer reads per account), because "Match" had no index besides its
-- primary key.
--
-- The lookup now targets data->'metadata'->'participants', a 10-element array of
-- puuid strings, instead of data->'info'->'participants', which carries the full
-- per-participant stat blob (~126x larger). Both yield identical rows.
--
-- jsonb_path_ops is smaller and faster than the default jsonb_ops and supports
-- the @> operator, which is the only one used against this column.
CREATE INDEX "Match_metadata_participants_idx"
    ON "Match" USING GIN ((data -> 'metadata' -> 'participants') jsonb_path_ops);

-- Supports the ORDER BY "gameCreation" DESC LIMIT 50 applied to that lookup.
CREATE INDEX "Match_gameCreation_idx" ON "Match"("gameCreation" DESC);
