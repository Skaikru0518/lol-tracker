export const GRADES = ["S+", "S", "A", "B", "C", "D"] as const;
export type Grade = (typeof GRADES)[number];

const MIN_SCORE: [Grade, number][] = [
	["S+", 90],
	["S", 80],
	["A", 70],
	["B", 55],
	["C", 40],
	["D", 0],
];

export function gradeFor(score: number): Grade {
	return MIN_SCORE.find(([, min]) => score >= min)?.[0] ?? "D";
}

export const GRADE_COLORS: Record<Grade, string> = {
	"S+": "#f5c542",
	S: "#a78bfa",
	A: "#34c38f",
	B: "#5b8bf5",
	C: "#f39c12",
	D: "#ef5350",
};
