"use client";

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
