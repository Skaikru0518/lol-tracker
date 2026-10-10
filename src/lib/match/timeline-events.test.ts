import { describe, expect, it } from "vitest";
import { type Timeline } from "@/lib/validators/timeline";
import {
	cumulativeKills,
	gameEndMs,
	grubWaves,
	teamSeries,
	killTicks,
	objectiveEvents,
	objectiveSummary,
	playerFightEvents,
	skillLevels,
	skillMaxOrder,
} from "./timeline-events";

const timeline = (events: object[], end = 1_800_000) =>
	({ info: { frames: [{ timestamp: 0, participantFrames: {}, events }, { timestamp: end, participantFrames: {}, events: [] }] } }) as unknown as Timeline;

const at = (minute: number) => minute * 60_000;

describe("objectiveEvents", () => {
	it("names dragons by type and credits the killer team", () => {
		const [dragon] = objectiveEvents(timeline([{ type: "ELITE_MONSTER_KILL", timestamp: at(8), monsterType: "DRAGON", monsterSubType: "FIRE_DRAGON", killerTeamId: 200 }]));
		expect(dragon).toMatchObject({ kind: "dragon", side: "red", label: "Infernal Dragon" });
	});

	it("treats the Elder subtype as elder", () => {
		const [elder] = objectiveEvents(timeline([{ type: "ELITE_MONSTER_KILL", timestamp: at(30), monsterType: "DRAGON", monsterSubType: "ELDER_DRAGON", killerTeamId: 100 }]));
		expect(elder.kind).toBe("elder");
	});

	it("credits a building to the team that did not own it, sorted by time", () => {
		const events = objectiveEvents(
			timeline([
				{ type: "BUILDING_KILL", timestamp: at(20), teamId: 200, buildingType: "INHIBITOR_BUILDING", laneType: "MID_LANE" },
				{ type: "BUILDING_KILL", timestamp: at(11), teamId: 100, buildingType: "TOWER_BUILDING", laneType: "BOT_LANE", towerType: "OUTER_TURRET" },
			]),
		);
		expect(events.map((e) => [e.kind, e.side, e.label])).toEqual([
			["tower", "red", "Bot T1"],
			["inhibitor", "blue", "Mid inhibitor"],
		]);
	});

	it("ignores unknown monsters", () => {
		expect(objectiveEvents(timeline([{ type: "ELITE_MONSTER_KILL", timestamp: 1, monsterType: "SCUTTLE", killerTeamId: 100 }]))).toEqual([]);
	});
});

describe("killTicks", () => {
	it("uses the killer's side, and the victim's enemies for executions", () => {
		const ticks = killTicks(
			timeline([
				{ type: "CHAMPION_KILL", timestamp: at(3), killerId: 2, victimId: 7 },
				{ type: "CHAMPION_KILL", timestamp: at(5), killerId: 0, victimId: 7 },
			]),
		);
		expect(ticks.map((t) => t.side)).toEqual(["blue", "blue"]);
	});
});

describe("objectiveSummary", () => {
	it("finds the firsts and counts per side", () => {
		const summary = objectiveSummary(
			timeline([
				{ type: "CHAMPION_KILL", timestamp: at(3), killerId: 7, victimId: 2 },
				{ type: "ELITE_MONSTER_KILL", timestamp: at(6), monsterType: "HORDE", killerTeamId: 100 },
				{ type: "ELITE_MONSTER_KILL", timestamp: at(8), monsterType: "DRAGON", monsterSubType: "AIR_DRAGON", killerTeamId: 100 },
				{ type: "BUILDING_KILL", timestamp: at(11), teamId: 100, buildingType: "TOWER_BUILDING" },
			]),
		);
		expect(summary.firstBlood).toEqual({ side: "red", timestamp: at(3) });
		expect(summary.firstDragon).toEqual({ side: "blue", timestamp: at(8) });
		expect(summary.firstTower).toEqual({ side: "red", timestamp: at(11) });
		expect(summary.counts.grubs).toEqual({ blue: 1, red: 0 });
		expect(summary.counts.towers).toEqual({ blue: 0, red: 1 });
	});

	it("is empty for a match without events", () => {
		const summary = objectiveSummary(timeline([]));
		expect([summary.firstBlood, summary.firstTower, summary.firstDragon]).toEqual([null, null, null]);
		expect(summary.counts.dragons).toEqual({ blue: 0, red: 0 });
	});
});

describe("playerFightEvents", () => {
	it("lists kills, deaths and assists with the other player and the position", () => {
		const events = playerFightEvents(
			timeline([
				{ type: "CHAMPION_KILL", timestamp: at(4), killerId: 3, victimId: 8, assistingParticipantIds: [1], position: { x: 1000, y: 2000 } },
				{ type: "CHAMPION_KILL", timestamp: at(9), killerId: 1, victimId: 9, position: { x: 5000, y: 5000 } },
				{ type: "CHAMPION_KILL", timestamp: at(14), killerId: 6, victimId: 1 },
			]),
			1,
		);
		expect(events.map((e) => [e.role, e.otherId, e.x])).toEqual([
			["assist", 8, 1000],
			["kill", 9, 5000],
			["death", 6, null],
		]);
	});
});

describe("skillLevels / skillMaxOrder", () => {
	it("reads the player's level-ups in order", () => {
		const levels = skillLevels(
			timeline([
				{ type: "SKILL_LEVEL_UP", timestamp: 1, participantId: 1, skillSlot: 1 },
				{ type: "SKILL_LEVEL_UP", timestamp: 2, participantId: 2, skillSlot: 3 },
				{ type: "SKILL_LEVEL_UP", timestamp: 3, participantId: 1, skillSlot: 3 },
			]),
			1,
		);
		expect(levels).toEqual([1, 3]);
	});

	it("skips evolution level-ups (Kha'Zix, Kai'Sa)", () => {
		const levels = skillLevels(
			timeline([
				{ type: "SKILL_LEVEL_UP", timestamp: 1, participantId: 1, skillSlot: 1, levelUpType: "NORMAL" },
				{ type: "SKILL_LEVEL_UP", timestamp: 2, participantId: 1, skillSlot: 2, levelUpType: "EVOLVE" },
				{ type: "SKILL_LEVEL_UP", timestamp: 3, participantId: 1, skillSlot: 3, levelUpType: "NORMAL" },
			]),
			1,
		);
		expect(levels).toEqual([1, 3]);
	});

	it("orders basic skills by when they were maxed, R first", () => {
		const levels = [1, 2, 3, 1, 1, 4, 1, 3, 1, 3, 4, 3, 2, 2, 3, 4, 2, 2];
		expect(skillMaxOrder(levels)).toEqual([4, 1, 3, 2]);
	});

	it("orders unfinished skills by points", () => {
		expect(skillMaxOrder([3, 1, 3, 2, 3])).toEqual([4, 3, 1, 2]);
	});
});

describe("gameEndMs", () => {
	it("is the last frame's timestamp, at least 1", () => {
		expect(gameEndMs(timeline([], 1_500_000))).toBe(1_500_000);
		expect(gameEndMs({ info: { frames: [] } } as unknown as Timeline)).toBe(1);
	});
});

describe("grubWaves", () => {
	const grub = (minute: number, killerTeamId: number) => ({ type: "ELITE_MONSTER_KILL", timestamp: at(minute), monsterType: "HORDE", killerTeamId });

	it("merges each wave into one icon for the team that took at least two", () => {
		const events = grubWaves(objectiveEvents(timeline([grub(6, 100), grub(6.2, 200), grub(6.4, 100), grub(10, 200), grub(10.1, 200), grub(10.3, 200)])));
		expect(events.map((e) => [e.side, e.label, e.timestamp])).toEqual([
			["blue", "Void Grubs 2–1", at(6.4)],
			["red", "Void Grubs 0–3", at(10.3)],
		]);
	});

	it("leaves other objectives untouched and in order", () => {
		const events = grubWaves(
			objectiveEvents(timeline([grub(6, 100), { type: "ELITE_MONSTER_KILL", timestamp: at(8), monsterType: "DRAGON", killerTeamId: 200 }])),
		);
		expect(events.map((e) => e.kind)).toEqual(["grubs", "dragon"]);
	});
});

describe("killTicks details", () => {
	it("keeps killer and victim ids", () => {
		const [tick] = killTicks(timeline([{ type: "CHAMPION_KILL", timestamp: at(3), killerId: 2, victimId: 7 }]));
		expect([tick.killerId, tick.victimId]).toEqual([2, 7]);
	});
});

describe("cumulativeKills", () => {
	it("counts kills per side up to each frame", () => {
		const t = {
			info: {
				frames: [
					{ timestamp: 0, participantFrames: {}, events: [] },
					{ timestamp: at(1), participantFrames: {}, events: [{ type: "CHAMPION_KILL", timestamp: at(0.5), killerId: 2, victimId: 7 }] },
					{ timestamp: at(2), participantFrames: {}, events: [{ type: "CHAMPION_KILL", timestamp: at(1.5), killerId: 0, victimId: 2 }] },
				],
			},
		} as unknown as Timeline;
		expect(cumulativeKills(t)).toEqual([
			{ minute: 0, blue: 0, red: 0 },
			{ minute: 1, blue: 1, red: 0 },
			{ minute: 2, blue: 1, red: 1 },
		]);
	});
});

describe("teamSeries", () => {
	it("sums CS (lane + jungle) and gold per side for each frame", () => {
		const pf = (participantId: number, minionsKilled: number, jungleMinionsKilled: number, totalGold: number) => ({
			participantId,
			minionsKilled,
			jungleMinionsKilled,
			totalGold,
			level: 1,
			xp: 0,
		});
		const t = { info: { frames: [{ timestamp: at(5), participantFrames: { "1": pf(1, 30, 4, 2000), "6": pf(6, 20, 0, 1500) }, events: [] }] } } as unknown as Timeline;
		expect(teamSeries(t, "cs")).toEqual([{ minute: 5, blue: 34, red: 20 }]);
		expect(teamSeries(t, "gold")).toEqual([{ minute: 5, blue: 2000, red: 1500 }]);
	});
});
