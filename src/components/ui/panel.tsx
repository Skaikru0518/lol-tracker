import { cn } from "@/lib/utils";

/** Bordered surface that groups one section of a page. */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
	return (
		<section
			data-slot="panel"
			className={cn(
				"overflow-hidden rounded-lg border bg-card text-card-foreground",
				className,
			)}
			{...props}
		/>
	);
}

/** Title row of a panel with an optional actions slot on the right. */
export function PanelHeader({
	title,
	actions,
	className,
	...props
}: Omit<React.ComponentProps<"header">, "title"> & {
	title: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<header
			data-slot="panel-header"
			className={cn(
				"flex min-h-11 items-center justify-between gap-3 border-b px-4 py-2",
				className,
			)}
			{...props}
		>
			{typeof title === "string" ? (
				<h2 className="text-sm font-semibold text-foreground">{title}</h2>
			) : (
				<div className="flex items-center gap-2 text-sm font-semibold text-foreground">{title}</div>
			)}
			{actions && <div className="flex items-center gap-2">{actions}</div>}
		</header>
	);
}

/** Padded content area of a panel. */
export function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="panel-body" className={cn("p-4", className)} {...props} />
	);
}
