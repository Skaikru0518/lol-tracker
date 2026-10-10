import { describe, expect, it } from "vitest";
import { RANKED_QUEUE_TYPES, rankedQueueForQueueId } from "./ranked-queues";

describe("rankedQueueForQueueId", () => {
	it.each([
		[420, "RANKED_SOLO_5x5"],
		[440, "RANKED_FLEX_SR"],
		[710, "RANKED_PREMADE_5x5"],
	])("maps queue %i to %s", (queueId, queueType) => {
		expect(rankedQueueForQueueId(queueId)).toBe(queueType);
	});

	it("is null for unranked queues", () => {
		expect(rankedQueueForQueueId(450)).toBeNull();
	});
});

describe("RANKED_QUEUE_TYPES", () => {
	it("orders solo, flex, then 5s", () => {
		expect(RANKED_QUEUE_TYPES).toEqual(["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"]);
	});
});
