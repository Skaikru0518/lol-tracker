-- Riot returns a `challenges` object and a `missions` object on every match
-- participant. Nothing in this app reads either: our achievements and badges are
-- derived from kills, damage, vision and so on, not from Riot's challenge
-- progress. Together they were ~49% of every stored participant, and
-- participants are ~97% of a match document.
--
-- New matches are trimmed before they are stored. This backfills the rows that
-- were written before that, roughly halving both the table and the payload of
-- every response built from it.
--
-- WITH ORDINALITY keeps the participant order intact: the match views slice the
-- array into teams by position, so a reordered array would scramble them.
UPDATE "Match"
SET data = jsonb_set(
        data,
        '{info,participants}',
        (
            SELECT jsonb_agg(participant - 'challenges' - 'missions' ORDER BY position)
            FROM jsonb_array_elements(data -> 'info' -> 'participants')
                 WITH ORDINALITY AS elements(participant, position)
        )
    )
WHERE data -> 'info' -> 'participants' -> 0 -> 'challenges' IS NOT NULL
   OR data -> 'info' -> 'participants' -> 0 -> 'missions' IS NOT NULL;
