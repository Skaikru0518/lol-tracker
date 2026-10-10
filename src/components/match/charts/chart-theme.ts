/** Shared recharts props so every match chart uses the same tokens. */
export const AXIS = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

export const GRID = { stroke: "var(--border)", strokeDasharray: "3 3", vertical: false } as const;

export const TOOLTIP_STYLE = {
	contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" },
	labelStyle: { color: "var(--muted-foreground)" },
	cursor: { stroke: "var(--border)" },
} as const;

export const TEAM_COLOR = { blue: "var(--team-blue)", red: "var(--team-red)" } as const;
