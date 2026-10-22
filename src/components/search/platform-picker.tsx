"use client";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORM_LIST, PLATFORMS, type Platform } from "@/lib/game/platforms";

export function PlatformPicker({ value, onChange, compact }: { value: Platform; onChange: (platform: Platform) => void; compact?: boolean }) {
	return (
		<Select value={value} onValueChange={(v) => onChange(v as Platform)}>
			<SelectTrigger aria-label="Server" className={cn("shrink-0 bg-card font-semibold", compact ? "h-9 w-20 text-xs" : "h-12! w-24 text-sm")}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent position="popper">
				{PLATFORM_LIST.map((p) => (
					<SelectItem key={p} value={p}>
						{PLATFORMS[p].label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
