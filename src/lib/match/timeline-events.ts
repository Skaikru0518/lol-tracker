import { getBuildingIcon, getObjectiveIcon } from "@/lib/game/icon-helpers";
import { type Timeline } from "@/lib/validators/timeline";

export type Side = "blue" | "red";

export type ObjectiveKind = "dragon" | "elder" | "baron" | "herald" | "grubs" | "atakhan" | "tower" | "inhibitor";

export interface ObjectiveEvent {
	timestamp: number;
	side: Side;
	kind: ObjectiveKind;
	label: string;
	icon: string;
}

const MONSTER_KINDS: Record<string, ObjectiveKind> = {
	DRAGON: "dragon",
	BARON_NASHOR: "baron",
	RIFTHERALD: "herald",
	HORDE: "grubs",
	ATAKHAN: "atakhan",
};

const KIND_LABELS: Record<ObjectiveKind, string> = {
	dragon: "Dragon",
	elder: "Elder Dragon",
	baron: "Baron Nashor",
	herald: "Rift Herald",
	grubs: "Void Grub",
	atakhan: "Atakhan",
	tower: "Tower",
	inhibitor: "Inhibitor",
};

const DRAGON_NAMES: Record<string, string> = {
	FIRE_DRAGON: "Infernal",
	WATER_DRAGON: "Ocean",
	EARTH_DRAGON: "Mountain",
	AIR_DRAGON: "Cloud",
	HEXTECH_DRAGON: "Hextech",
	CHEMTECH_DRAGON: "Chemtech",
};

const LANES: Record<string, string> = { TOP_LANE: "Top", MID_LANE: "Mid", BOT_LANE: "Bot" };
const TOWERS: Record<string, string> = { OUTER_TURRET: "T1", INNER_TURRET: "T2", BASE_TURRET: "T3", NEXUS_TURRET: "Nexus" };

/** Blue for participants 1-5, red for 6-10. */
const sideOfParticipant = (id: number): Side => (id <= 5 ? "blue" : "red");
const enemy = (side: Side): Side => (side === "blue" ? "red" : "blue");
const allEvents = (timeline: Timeline) => timeline.info.frames.flatMap((frame) => frame.events);

/** Timestamp of the last frame, at least 1 so it can divide. */
export function gameEndMs(timeline: Timeline): number {
	return Math.max(timeline.info.frames.at(-1)?.timestamp ?? 0, 1);
}

/** Elite monsters and buildings in time order; a building counts for the team that destroyed it. */
export function objectiveEvents(timeline: Timeline): ObjectiveEvent[] {
	const out: ObjectiveEvent[] = [];
	for (const e of allEvents(timeline)) {
		if (e.type === "ELITE_MONSTER_KILL" && e.monsterType) {
			const base = MONSTER_KINDS[e.monsterType];
			if (!base) continue;
			const kind: ObjectiveKind = base === "dragon" && e.monsterSubType === "ELDER_DRAGON" ? "elder" : base;
			const dragonName = kind === "dragon" ? DRAGON_NAMES[e.monsterSubType ?? ""] : undefined;
			out.push({
				timestamp: e.timestamp,
				side: e.killerTeamId === 200 ? "red" : "blue",
				kind,
				label: dragonName ? `${dragonName} Dragon` : KIND_LABELS[kind],
				icon: getObjectiveIcon(kind === "elder" ? "ELDER_DRAGON" : e.monsterType),
			});
		} else if (e.type === "BUILDING_KILL") {
			const inhibitor = e.buildingType === "INHIBITOR_BUILDING";
			const lane = LANES[e.laneType ?? ""] ?? "";
			const name = inhibitor ? "inhibitor" : (TOWERS[e.towerType ?? ""] ?? "tower");
			out.push({
				timestamp: e.timestamp,
				side: e.teamId === 100 ? "red" : "blue",
				kind: inhibitor ? "inhibitor" : "tower",
				label: `${lane} ${name}`.trim(),
				icon: getBuildingIcon(e.buildingType ?? "TOWER_BUILDING"),
			});
		}
	}
	return out.sort((a, b) => a.timestamp - b.timestamp);
}

export interface KillTick {
	timestamp: number;
	side: Side;
	killerId: number;
	victimId: number;
}

/** Champion kills by the killer's side; executions (killer 0) count for the victim's enemies. */
export function killTicks(timeline: Timeline): KillTick[] {
	return allEvents(timeline)
		.filter((e) => e.type === "CHAMPION_KILL" && e.victimId)
		.map((e) => ({
			timestamp: e.timestamp,
			side: e.killerId ? sideOfParticipant(e.killerId) : enemy(sideOfParticipant(e.victimId!)),
			killerId: e.killerId ?? 0,
			victimId: e.victimId!,
		}));
}

export interface FirstTaken {
	side: Side;
	timestamp: number;
}

export interface ObjectiveSummary {
	firstBlood: FirstTaken | null;
	firstTower: FirstTaken | null;
	firstDragon: FirstTaken | null;
	counts: Record<"dragons" | "grubs" | "barons" | "towers", Record<Side, number>>;
}

/** First blood, first tower and first dragon, plus dragon, grub, baron and tower counts per side. */
export function objectiveSummary(timeline: Timeline, precomputed?: { objectives: ObjectiveEvent[]; kills: KillTick[] }): ObjectiveSummary {
	const objectives = precomputed?.objectives ?? objectiveEvents(timeline);
	const first = (kinds: ObjectiveKind[]) => {
		const hit = objectives.find((o) => kinds.includes(o.kind));
		return hit ? { side: hit.side, timestamp: hit.timestamp } : null;
	};
	const count = (kinds: ObjectiveKind[]) => {
		const result = { blue: 0, red: 0 };
		for (const o of objectives) if (kinds.includes(o.kind)) result[o.side]++;
		return result;
	};
	const blood = (precomputed?.kills ?? killTicks(timeline))[0];
	return {
		firstBlood: blood ? { side: blood.side, timestamp: blood.timestamp } : null,
		firstTower: first(["tower"]),
		firstDragon: first(["dragon", "elder"]),
		counts: { dragons: count(["dragon", "elder"]), grubs: count(["grubs"]), barons: count(["baron"]), towers: count(["tower"]) },
	};
}

export type FightRole = "kill" | "death" | "assist";

export interface FightEvent {
	id: string;
	timestamp: number;
	role: FightRole;
	otherId: number;
	x: number | null;
	y: number | null;
}

/** The player's kills, deaths and assists in time order; `otherId` is the victim, or the killer for deaths (0 = execution). */
export function playerFightEvents(timeline: Timeline, participantId: number): FightEvent[] {
	const out: FightEvent[] = [];
	allEvents(timeline).forEach((e, index) => {
		if (e.type !== "CHAMPION_KILL" || !e.victimId) return;
		let role: FightRole | null = null;
		if (e.killerId === participantId) role = "kill";
		else if (e.victimId === participantId) role = "death";
		else if (e.assistingParticipantIds?.includes(participantId)) role = "assist";
		if (!role) return;
		out.push({
			id: `${e.timestamp}-${index}`,
			timestamp: e.timestamp,
			role,
			otherId: role === "death" ? (e.killerId ?? 0) : e.victimId,
			x: e.position?.x ?? null,
			y: e.position?.y ?? null,
		});
	});
	return out;
}

/** Skill slot (1 Q, 2 W, 3 E, 4 R) of each point the player spent, in order; evolutions are not points. */
export function skillLevels(timeline: Timeline, participantId: number): number[] {
	return allEvents(timeline)
		.filter((e) => e.type === "SKILL_LEVEL_UP" && e.levelUpType !== "EVOLVE" && e.participantId === participantId && e.skillSlot && e.skillSlot <= 4)
		.map((e) => e.skillSlot!);
}

const BASIC_SLOTS = [1, 2, 3];
const MAX_POINTS = 5;

/** R first, then basic skills in the order they hit five points; unfinished ones by points spent. */
export function skillMaxOrder(levels: number[]): number[] {
	const points: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
	const maxed: number[] = [];
	for (const slot of levels) {
		if (!BASIC_SLOTS.includes(slot)) continue;
		points[slot]++;
		if (points[slot] === MAX_POINTS) maxed.push(slot);
	}
	const rest = BASIC_SLOTS.filter((s) => !maxed.includes(s)).sort((a, b) => points[b] - points[a] || a - b);
	return [4, ...maxed, ...rest];
}

const GRUB_WAVE_GAP_MS = 120_000;

/** Void Grubs merged into one icon per wave, owned by the team that took more of it (label "Void Grubs blue–red"). */
export function grubWaves(objectives: ObjectiveEvent[]): ObjectiveEvent[] {
	const out: ObjectiveEvent[] = [];
	let wave: ObjectiveEvent[] = [];
	const flush = () => {
		if (wave.length === 0) return;
		const blue = wave.filter((w) => w.side === "blue").length;
		const red = wave.length - blue;
		const side: Side = blue === red ? wave[0].side : blue > red ? "blue" : "red";
		out.push({ ...wave[wave.length - 1], side, label: `Void Grubs ${blue}–${red}` });
		wave = [];
	};
	for (const o of objectives) {
		if (o.kind !== "grubs") {
			out.push(o);
			continue;
		}
		if (wave.length > 0 && o.timestamp - wave[wave.length - 1].timestamp > GRUB_WAVE_GAP_MS) flush();
		wave.push(o);
	}
	flush();
	return out.sort((a, b) => a.timestamp - b.timestamp);
}

export interface TeamPoint {
	minute: number;
	blue: number;
	red: number;
}

/** Each side's running kill total at every frame; executions count for the victim's enemies. */
export function cumulativeKills(timeline: Timeline): TeamPoint[] {
	const totals = { blue: 0, red: 0 };
	return timeline.info.frames.map((frame) => {
		for (const e of frame.events) {
			if (e.type !== "CHAMPION_KILL" || !e.victimId) continue;
			totals[e.killerId ? sideOfParticipant(e.killerId) : enemy(sideOfParticipant(e.victimId))]++;
		}
		return { minute: Math.round(frame.timestamp / 60000), ...totals };
	});
}

/** Each side's CS (lane plus jungle) or total gold at every frame. */
export function teamSeries(timeline: Timeline, metric: "cs" | "gold"): TeamPoint[] {
	return timeline.info.frames.map((frame) => {
		const point = { minute: Math.round(frame.timestamp / 60000), blue: 0, red: 0 };
		for (const pf of Object.values(frame.participantFrames)) {
			const value = metric === "cs" ? pf.minionsKilled + (pf.jungleMinionsKilled ?? 0) : pf.totalGold;
			point[sideOfParticipant(pf.participantId)] += value;
		}
		return point;
	});
}
