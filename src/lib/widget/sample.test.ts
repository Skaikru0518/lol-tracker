import { describe, expect, it } from "vitest";
import { SAMPLE_WIDGET, withSampleSession } from "./sample";

const real = { ...SAMPLE_WIDGET, gameName: "Real", games: [], record: { wins: 0, losses: 0 }, lpChange: null, liveChampion: null };

describe("withSampleSession", () => {
	it("fills an empty session with sample games and keeps the real identity and rank", () => {
		const { data, sample } = withSampleSession(real);
		expect(sample).toBe(true);
		expect(data.gameName).toBe("Real");
		expect(data.games.length).toBeGreaterThan(0);
		expect(data.lpChange).toBe(SAMPLE_WIDGET.lpChange);
		expect(data.record).toEqual(SAMPLE_WIDGET.record);
	});

	it("keeps the real season record and no LP change for an empty season view", () => {
		const season = { ...real, scope: "season" as const, record: { wins: 157, losses: 145 } };
		const { data, sample } = withSampleSession(season);
		expect(sample).toBe(true);
		expect(data.record).toEqual({ wins: 157, losses: 145 });
		expect(data.lpChange).toBeNull();
		expect(data.games.length).toBeGreaterThan(0);
	});

	it("keeps a real session as it is", () => {
		const withGames = { ...real, games: SAMPLE_WIDGET.games.slice(0, 1) };
		expect(withSampleSession(withGames)).toEqual({ data: withGames, sample: false });
	});
});
