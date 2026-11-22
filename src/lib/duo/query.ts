import { prisma } from "@/lib/server/db";
import { RIFT_QUEUE_IDS } from "@/lib/game/queue-filters";
import { REMAKE_SECONDS } from "@/lib/match/remake";
import { type DuoGame } from "./partners";

const WINDOW = 50;

/** The profile's last 50 stored Rift games (no remakes), projected to the fields Duo reads. */
export async function loadDuoWindow(puuid: string): Promise<DuoGame[]> {
	const rows = await prisma.$queryRaw<(Omit<DuoGame, "gameCreation"> & { gameCreation: bigint })[]>`
		SELECT
			m."matchId",
			m."queueId",
			m."gameCreation",
			COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'puuid', x->'puuid',
					'teamId', x->'teamId',
					'win', x->'win',
					'teamPosition', COALESCE(x->'teamPosition', '""'::jsonb),
					'championName', x->'championName',
					'kills', x->'kills',
					'deaths', x->'deaths',
					'assists', x->'assists',
					'riotIdGameName', COALESCE(x->'riotIdGameName', '""'::jsonb),
					'riotIdTagline', COALESCE(x->'riotIdTagline', '""'::jsonb),
					'profileIcon', x->'profileIcon'
				))
				FROM jsonb_array_elements(m.data->'info'->'participants') AS x
			), '[]'::jsonb) AS participants
		FROM "Match" m
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND m."queueId" = ANY(${RIFT_QUEUE_IDS}::int[])
			AND m."gameDuration" >= ${REMAKE_SECONDS}
		ORDER BY m."gameCreation" DESC
		LIMIT ${WINDOW}
	`;
	return rows.map((r) => ({ ...r, gameCreation: Number(r.gameCreation) }));
}
