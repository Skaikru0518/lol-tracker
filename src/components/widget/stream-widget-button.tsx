"use client";

import { MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WidgetGenerator } from "./widget-generator";

export function StreamWidgetButton({ slug, riotId, version }: { slug: string; riotId: string; version: string }) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline" title="Stream widget for OBS" className="border-primary/60 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/15">
					<MonitorPlay className="size-3.5" />
					Stream widget
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>Stream widget</DialogTitle>
					<DialogDescription>{riotId}: pick a style, copy the URL and add it to OBS as a Browser Source.</DialogDescription>
				</DialogHeader>
				<WidgetGenerator slug={slug} version={version} />
			</DialogContent>
		</Dialog>
	);
}
