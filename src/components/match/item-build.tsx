"use client";

import { useMemo } from "react";
import Image from "next/image";
import { type Timeline } from "@/lib/validators/timeline";
import { getItemIcon } from "@/lib/icon-helpers";
import IconTooltip from "@/components/ui/icon-tooltip";

interface ItemBuildProps {
	timeline?: Timeline;
	participantId: number;
	version?: string;
	itemNames?: Map<number, string>;
}

const CONSUMABLE_IDS = new Set([
	2003, 2031, 2033, 2138, 2139, 2140, 3340, 3363, 3364,
]);

const GROUP_THRESHOLD_MS = 30_000;

interface ItemPurchase {
	itemId: number;
	timestamp: number;
}

interface ItemGroup {
	items: ItemPurchase[];
	timestamp: number;
}

function formatTime(ms: number): string {
	const min = Math.floor(ms / 1000 / 60);
	const sec = Math.floor((ms / 1000) % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function ItemBuild({
	timeline,
	participantId,
	version,
	itemNames,
}: ItemBuildProps) {
	const groups = useMemo(() => {
		if (!timeline || !version) return null;

		const purchases: ItemPurchase[] = [];
		for (const frame of timeline.info.frames) {
			for (const event of frame.events) {
				if (
					event.type === "ITEM_PURCHASED" &&
					event.participantId === participantId &&
					event.itemId != null
				) {
					purchases.push({
						itemId: event.itemId,
						timestamp: event.timestamp,
					});
				}
			}
		}

		if (purchases.length === 0) return null;
		purchases.sort((a, b) => a.timestamp - b.timestamp);

		const grouped: ItemGroup[] = [];
		let current: ItemGroup = {
			items: [purchases[0]],
			timestamp: purchases[0].timestamp,
		};

		for (let i = 1; i < purchases.length; i++) {
			const purchase = purchases[i];
			if (
				purchase.timestamp - current.timestamp <=
				GROUP_THRESHOLD_MS
			) {
				current.items.push(purchase);
			} else {
				grouped.push(current);
				current = {
					items: [purchase],
					timestamp: purchase.timestamp,
				};
			}
		}
		grouped.push(current);

		return grouped;
	}, [timeline, participantId, version]);

	if (!version || !timeline || !groups) return null;

	return (
		<div className="flex flex-wrap items-center gap-3">
			{groups.map((group, gi) => (
				<div key={gi} className="flex items-center gap-3">
					{gi > 0 && (
						<span className="text-muted-foreground/40 text-lg select-none">
							›
						</span>
					)}
					<div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/10 px-4 py-2.5">
						<span className="text-sm text-muted-foreground font-mono mr-1">
							{formatTime(group.timestamp)}
						</span>
						{group.items.map((item, ii) => {
							const icon = getItemIcon(version, item.itemId);
							if (!icon) return null;
							const isConsumable = CONSUMABLE_IDS.has(
								item.itemId,
							);
							const name =
								itemNames?.get(item.itemId) ??
								`Item ${item.itemId}`;
							return (
								<IconTooltip
									key={`${gi}-${ii}`}
									label={name}
								>
									<Image
										src={icon}
										alt={name}
										width={isConsumable ? 24 : 32}
										height={isConsumable ? 24 : 32}
										className={`rounded-md cursor-pointer hover:scale-110 transition-transform ${
											isConsumable ? "opacity-50" : ""
										}`}
									/>
								</IconTooltip>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
