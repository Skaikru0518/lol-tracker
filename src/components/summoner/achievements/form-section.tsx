import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ACHIEVEMENTS } from "@/lib/achievements/profile/definitions";
import { earnedForm } from "@/lib/achievements/profile/form-id";
import { type AchievementPayload } from "@/lib/validators/achievements";

/** Rolling Current form achievements from the last ranked games; these come and go. */
export function FormSection({ form }: { form: AchievementPayload["form"] }) {
	const earned = earnedForm(form.map((a) => a.achievementId));
	return (
		<Panel>
			<PanelHeader
				title="Current form"
				actions={
					<span className="text-xs text-muted-foreground">
						{earned.size} of {ACHIEVEMENTS.length} active
					</span>
				}
			/>
			<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
				{ACHIEVEMENTS.map((def) => {
					const a = earned.get(def.id);
					const shown = a ?? def;
					return (
						<div key={def.id} className={cn("flex items-center gap-3 rounded-md border p-3", !a && "opacity-50 grayscale")}>
							<img src={`/achi/${shown.icon}.svg`} alt="" width={32} height={32} className="size-8 shrink-0" />
							<div className="min-w-0">
								<p className="text-sm font-semibold" style={{ color: a ? a.color : undefined }}>
									{shown.name}
								</p>
								<p className="text-xs text-muted-foreground">{def.description}</p>
							</div>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}
