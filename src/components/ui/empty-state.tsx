import { cn } from "@/lib/utils";

/** Centered message for an empty or failed panel, with an optional action. */
export function EmptyState({
	title,
	description,
	action,
	className,
}: {
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center",
				className,
			)}
		>
			<p className="text-sm font-medium text-foreground">{title}</p>
			{description && (
				<p className="max-w-xs text-xs text-muted-foreground">{description}</p>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
