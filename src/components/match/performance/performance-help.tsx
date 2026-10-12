"use client";

import { CircleHelp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PerformanceHelpContent } from "./performance-help-content";

export function PerformanceHelp() {
	return (
		<Dialog>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<button type="button" aria-label="How performance scores work" className="text-muted-foreground transition-colors hover:text-foreground">
							<CircleHelp className="size-3.5" />
						</button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent>The circle is a 0–100 performance score against players in your role. Click for details.</TooltipContent>
			</Tooltip>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>How performance scores work</DialogTitle>
					<DialogDescription>What the score next to each ranked game means and how it is calculated.</DialogDescription>
				</DialogHeader>
				<PerformanceHelpContent />
			</DialogContent>
		</Dialog>
	);
}
