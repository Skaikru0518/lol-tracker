import { cn } from "@/lib/utils";

/** Splash-art header that fades into the page background; only the background layer clips, so overlays may extend past it. */
export function HeroBanner({
	splashUrl,
	objectPosition = "center 20%",
	className,
	children,
}: {
	splashUrl?: string | null;
	objectPosition?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("relative isolate", className)}>
			<div aria-hidden className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
				{splashUrl && <img src={splashUrl} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition }} />}
				<div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-background/90" />
				<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
			</div>
			{children}
		</div>
	);
}
