import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { earnedCount } from "@/lib/achievements/profile/count";
import { ACHIEVEMENTS } from "@/lib/achievements/profile/definitions";
import { type AchievementPayload } from "@/lib/validators/achievements";

/** Rolling Current form achievements from the last ranked games; these come and go. */
export function FormSection({ form }: { form: AchievementPayload["form"] }) {
	const earned = new Map(form.map((a) => [a.achievementId, a.earnedAt]));
	return (
		<Panel>
			<PanelHeader
				title="Current form"
				actions={
					<span className="text-xs text-muted-foreground">
						{earnedCount(form, ACHIEVEMENTS)} of {ACHIEVEMENTS.length} active
					</span>
				}
			/>
			<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
				{ACHIEVEMENTS.map((a) => {
					const earnedAt = earned.get(a.id);
					return (
						<div key={a.id} className={cn("flex items-start gap-3 rounded-md border p-3", !earnedAt && "opacity-50 grayscale")}>
							<img src={`/achi/${a.icon}.svg`} alt="" width={32} height={32} className="size-8 shrink-0" />
							<div className="min-w-0">
								<p className="text-sm font-semibold" style={{ color: earnedAt ? a.color : undefined }}>
									{a.name}
								</p>
								<p className="text-xs text-muted-foreground">{a.description}</p>
							</div>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}
