import { cn } from "@/lib/utils";

/** The Summon.gg wordmark. Size it through `className` (font size). */
export function Logo({ className }: { className?: string }) {
	return (
		<span className={cn("font-bold tracking-tight text-foreground", className)}>
			<span className="text-primary">Summon</span>.gg
		</span>
	);
}
