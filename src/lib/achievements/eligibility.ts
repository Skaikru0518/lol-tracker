/** Queues that earn achievements and match badges: Ranked Solo, Flex and 5s. */
export const ACHIEVEMENT_QUEUE_IDS = [420, 440, 710];

/** Games shorter than this are remakes and earn nothing. */
export const MIN_ACHIEVEMENT_GAME_SECONDS = 300;

/** Whether a game counts towards achievements and match badges. */
export function isAchievementEligible(queueId: number, gameDuration: number): boolean {
	return ACHIEVEMENT_QUEUE_IDS.includes(queueId) && gameDuration >= MIN_ACHIEVEMENT_GAME_SECONDS;
}
