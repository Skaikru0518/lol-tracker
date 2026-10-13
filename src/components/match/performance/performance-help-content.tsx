import { GRADE_COLORS, gradeBands } from "@/lib/performance/grades";
import { ROLE_LABELS, ROLES } from "@/lib/performance/roles";
import { CATEGORIES, CATEGORY_LABELS, ROLE_WEIGHTS, type CategoryId } from "@/lib/performance/weights";
import { ScoreCircle } from "./score-circle";

const FACTS = [
	"Every ranked Solo, Flex and 5s game gets a 0–100 score for each player.",
	"You are compared with players in your role from games Summon.gg stored over the last 60 days.",
	"An average game lands around 65 (B); S+ is roughly the top 7%.",
	"Normals, ARAM, Arena and remakes are not scored. A score never changes once calculated.",
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
			<div className="flex items-center gap-4 rounded-xl border p-3.5" style={{ backgroundImage: `linear-gradient(110deg, ${GRADE_COLORS.B}22, transparent 60%)` }}>
				<ScoreCircle score={65} grade="B" size="lg" />
				<ul className="grid flex-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
					{FACTS.map((fact) => (
						<li key={fact} className="flex gap-2">
							<span className="text-primary">◆</span>
							{fact}
						</li>
					))}
				</ul>
			</div>

			<Section title="Grades">
				<div>
					<div className="flex h-7 overflow-hidden rounded-lg text-xs font-extrabold text-black/80">
						{gradeBands().map(({ grade, min, max }) => (
							<div key={grade} className="flex items-center justify-center" style={{ width: `${max - min}%`, backgroundColor: GRADE_COLORS[grade] }}>
								{grade}
							</div>
						))}
					</div>
					<div className="relative mt-1 flex text-3xs">
						{gradeBands().map(({ grade, min, max }) => (
							<span key={grade} style={{ width: `${max - min}%` }}>
								{min}
							</span>
						))}
						<span className="absolute right-0">100</span>
					</div>
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
