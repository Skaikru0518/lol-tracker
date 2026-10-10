import { HeroBanner } from "@/components/ui/hero-banner";
import { Panel } from "@/components/ui/panel";
import { Logo } from "@/components/layout/logo";
import { getChampionSplash } from "@/lib/icon-helpers";

const FEATURES = ["Ranked Stats", "Match History", "Champion Mastery"] as const;

/** Full-page screen shown while `MAINTENANCE_MODE` is on. */
export default function MaintenanceScreen() {
	return (
		<HeroBanner
			splashUrl={getChampionSplash("Heimerdinger")}
			objectPosition="center 25%"
			className="min-h-screen"
		>
			<div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
				<Logo className="text-5xl sm:text-6xl" />

				<span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm font-medium text-gold">
					<span className="size-2 rounded-full bg-gold" />
					Under maintenance
				</span>

				<p className="max-w-md text-base text-muted-foreground">
					Summon.gg is getting an upgrade. We&apos;ll be back shortly.
				</p>

				<div className="flex flex-wrap justify-center gap-2">
					{FEATURES.map((feature) => (
						<Panel key={feature} className="px-3 py-2 text-sm text-foreground">
							{feature}
						</Panel>
					))}
				</div>
			</div>
		</HeroBanner>
	);
}
