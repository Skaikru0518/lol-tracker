import { type Participant } from "@/lib/validators/match";

export function isArenaMatch(queueId: number): boolean {
	return queueId === 1700 || queueId === 1710;
}

export interface ArenaTeam {
	placement: number;
	players: Participant[];
}

export function getArenaTeams(participants: Participant[]): ArenaTeam[] {
	const teamMap = new Map<number, Participant[]>();

	for (const p of participants) {
		const teamId = p.playerSubteamId ?? p.teamId;
		const existing = teamMap.get(teamId) ?? [];
		existing.push(p);
		teamMap.set(teamId, existing);
	}

	const teams: ArenaTeam[] = [];
	for (const [, players] of teamMap) {
		const placement = players[0]?.subteamPlacement ?? players[0]?.placement ?? 8;
		teams.push({ placement, players });
	}

	return teams.sort((a, b) => a.placement - b.placement);
}

export function getPlacementColor(placement: number): string {
	switch (placement) {
		case 1: return "#f1c40f";
		case 2: return "#bdc3c7";
		case 3: return "#e67e22";
		case 4: return "#2ecc71";
		default: return "#e74c3c";
	}
}

export function getPlacementSuffix(placement: number): string {
	switch (placement) {
		case 1: return "st";
		case 2: return "nd";
		case 3: return "rd";
		default: return "th";
	}
}

export function isArenaWin(placement: number): boolean {
	return placement <= 4;
}
