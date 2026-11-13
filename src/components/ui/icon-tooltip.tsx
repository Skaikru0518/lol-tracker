"use client";

// NOTE: Requires shadcn tooltip component to be installed.
// Run: npx shadcn@latest add tooltip
// If tooltip.tsx does not exist at @/components/ui/tooltip, install it first.

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface IconTooltipProps {
	label: React.ReactNode;
	children: React.ReactNode;
}

export default function IconTooltip({ label, children }: IconTooltipProps) {
	return (
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent>
					<div className="text-xs">{label}</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
