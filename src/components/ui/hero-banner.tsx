import { cn } from "@/lib/utils";

/** Splash-art header that fades into the page background. */
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
		<div className={cn("relative isolate overflow-hidden", className)}>
			{splashUrl && (
				<img
					src={splashUrl}
					alt=""
					aria-hidden
					className="absolute inset-0 -z-10 size-full object-cover"
					style={{ objectPosition }}
				/>
			)}
			<div
				aria-hidden
				className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/60 to-background/90"
			/>
			<div
				aria-hidden
				className="absolute inset-x-0 bottom-0 -z-10 h-16 bg-gradient-to-b from-transparent to-background"
			/>
			{children}
		</div>
	);
}
