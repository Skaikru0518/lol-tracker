import { HeroBanner } from "@/components/ui/hero-banner";
import { getChampionSplash } from "@/lib/game/icon-helpers";

/** Full-width message screen with an optional champion splash, a big code or title and action buttons below. */
export function ErrorScreen({
	code,
	title,
	description,
	splash,
	children,
}: {
	code?: string;
	title: string;
	description: string;
	splash?: string;
	children?: React.ReactNode;
}) {
	return (
		<HeroBanner splashUrl={splash ? getChampionSplash(splash) : null} objectPosition="center 30%" className="min-h-[70vh] border-b">
			<div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
				{code && <p className="text-7xl font-bold tracking-tight text-primary">{code}</p>}
				<h1 className="text-2xl font-bold text-foreground">{title}</h1>
				<p className="text-muted-foreground">{description}</p>
				{children && <div className="mt-2 flex w-full flex-col items-center gap-3">{children}</div>}
			</div>
		</HeroBanner>
	);
}
