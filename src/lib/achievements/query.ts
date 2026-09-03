import { prisma } from "@/lib/db";
import {
	achievementMatchSchema,
	type AchievementMatch,
} from "@/lib/validators/match";

/** How many of the player's most recent matches detection looks at. */
const MATCH_WINDOW = 50;

/**
 * Loads a player's recent matches, projected down to the fields achievement
 * detection actually reads.
 *
 * A stored match document is ~72 KB. Selecting whole documents meant a cron run
 * pulled ~219 MB out of Postgres and Zod-parsed all of it to compute a few
 * dozen numbers. Building the narrow shape in SQL keeps it near 1 KB per match.
 *
 * Every projected field is already required by `matchSchema`, which parses
 * these same rows elsewhere — so anything stored can supply them.
 */
export async function loadAchievementMatches(
	puuid: string,
): Promise<AchievementMatch[]> {
	const rows = await prisma.$queryRaw<{ match: unknown }[]>`
		SELECT jsonb_build_object(
			'info', jsonb_build_object(
				'queueId',      data->'info'->'queueId',
				'gameDuration', data->'info'->'gameDuration',
				'participants', COALESCE((
					SELECT jsonb_agg(jsonb_build_object(
						'puuid',                       p->'puuid',
						'teamId',                      p->'teamId',
						'championName',                p->'championName',
						'teamPosition',                p->'teamPosition',
						'win',                         p->'win',
						'kills',                       p->'kills',
						'deaths',                      p->'deaths',
						'assists',                     p->'assists',
						'pentaKills',                  p->'pentaKills',
						'firstBloodKill',              p->'firstBloodKill',
						'totalMinionsKilled',          p->'totalMinionsKilled',
						'neutralMinionsKilled',        p->'neutralMinionsKilled',
						'visionScore',                 p->'visionScore',
						'totalDamageDealtToChampions', p->'totalDamageDealtToChampions',
						'totalDamageTaken',            p->'totalDamageTaken',
						'dragonKills',                 p->'dragonKills'
					))
					FROM jsonb_array_elements(data->'info'->'participants') AS p
				), '[]'::jsonb)
			)
		) AS match
		FROM "Match"
		WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
		ORDER BY "gameCreation" DESC
		LIMIT ${MATCH_WINDOW}
	`;

	return rows.map((row) => achievementMatchSchema.parse(row.match));
}
