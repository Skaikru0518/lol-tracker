import { describe, expect, it } from "vitest";
import { getQueueName } from "./queue-names";

describe("getQueueName", () => {
	it.each([
		[710, "Ranked 5s"],
		[2400, "ARAM Mayhem"],
		[1750, "Arena"],
		[900, "ARURF"],
		[1010, "Snow ARURF"],
		[1900, "Pick URF"],
		[2300, "Brawl"],
		[890, "Co-op Intermediate"],
	])("names queue %i as %s", (queueId, name) => {
		expect(getQueueName(queueId)).toBe(name);
	});

	it("falls back for queues Riot adds later", () => {
		expect(getQueueName(9999, "NEWMODE")).toBe("NEWMODE");
	});
});
