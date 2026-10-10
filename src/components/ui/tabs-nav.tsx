"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildTabHref, isTabActive } from "@/lib/ui/tabs";

/** One route tab. `segment` is the child route segment, `null` for the index. */
export interface TabItem {
	label: string;
	segment: string | null;
}

/** Link tab bar for nested routes; render it from the owning layout. */
export function TabsNav({
	basePath,
	tabs,
	className,
}: {
	basePath: string;
	tabs: readonly TabItem[];
	className?: string;
}) {
	const activeSegment = useSelectedLayoutSegment();

	return (
		<nav
			className={cn(
				"flex gap-6 overflow-x-auto border-b [scrollbar-width:none]",
				className,
			)}
		>
			{tabs.map((tab) => {
				const active = isTabActive(activeSegment, tab.segment);
				return (
					<Link
						key={tab.label}
						href={buildTabHref(basePath, tab.segment)}
						aria-current={active ? "page" : undefined}
						className={cn(
							"-mb-px whitespace-nowrap border-b-2 py-2.5 text-sm font-medium transition-colors",
							active
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
