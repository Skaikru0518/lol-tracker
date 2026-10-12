import { GRADE_COLORS, type Grade } from "@/lib/performance/grades";
import { ROLE_LABELS, ROLES } from "@/lib/performance/roles";
import { CATEGORIES, CATEGORY_LABELS, ROLE_WEIGHTS, type CategoryId } from "@/lib/performance/weights";

const GRADE_RANGES: [Grade, string][] = [
	["S+", "90+"],
	["S", "80–89"],
	["A", "70–79"],
	["B", "55–69"],
	["C", "40–54"],
	["D", "below 40"],
];

const CATEGORY_HELP: Record<CategoryId, string> = {
	laning: "Gold, XP, CS and damage against your lane opponent, per minute.",
	farming: "CS and gold per minute.",
	combat: "KDA, deaths per minute (fewer is better) and kill participation.",
	teamfight: "Your share of your team's damage dealt and damage taken, and kill participation.",
	objectives: "Damage to objectives, dragons and barons, turrets and inhibitors, and objective steals.",
	vision: "Vision score, wards placed and destroyed per minute, and control wards bought.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="space-y-2">
			<h3 className="text-sm font-semibold text-foreground">{title}</h3>
			{children}
		</section>
	);
}

export function PerformanceHelpContent() {
	return (
		<div className="space-y-5 text-sm text-muted-foreground">
			<Section title="The score">
				<ul className="list-disc space-y-1 pl-5">
					<li>Every ranked Solo, Flex and 5s game gets a score from 0 to 100 for each player.</li>
					<li>You are compared with players in the same role from ranked games Summon.gg stored over the last 60 days.</li>
					<li>An average game lands around 65 (B); S+ is roughly the top 7% of games.</li>
					<li>Normals, ARAM, Arena and remakes are not scored. A game&apos;s score stays the same once it is calculated.</li>
				</ul>
			</Section>

			<Section title="Grades">
				<div className="flex flex-wrap gap-2">
					{GRADE_RANGES.map(([grade, range]) => (
						<span key={grade} className="rounded border px-2 py-0.5 text-xs">
							<span className="font-bold" style={{ color: GRADE_COLORS[grade] }}>
								{grade}
							</span>{" "}
							{range}
						</span>
					))}
				</div>
			</Section>

			<Section title="Categories">
				<ul className="space-y-1.5">
					{CATEGORIES.map((id) => (
						<li key={id}>
							<span className="font-semibold text-foreground">{CATEGORY_LABELS[id]}:</span> {CATEGORY_HELP[id]}
						</li>
					))}
				</ul>
			</Section>

			<Section title="How much each category counts">
				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="text-left">
								<th className="py-1 pr-2 font-medium">Role</th>
								{CATEGORIES.map((id) => (
									<th key={id} className="px-1 py-1 text-right font-medium">
										{CATEGORY_LABELS[id]}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{ROLES.map((role) => (
								<tr key={role} className="border-t">
									<td className="py-1 pr-2 text-foreground">{ROLE_LABELS[role]}</td>
									{CATEGORIES.map((id) => (
										<td key={id} className="px-1 py-1 text-right">
											{ROLE_WEIGHTS[role][id]}%
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Section>
		</div>
	);
}
