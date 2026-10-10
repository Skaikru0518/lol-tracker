"use client";

import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewSkins } from "@/hooks/useNewSkins";
import { rarityLabel } from "@/lib/new-skins";

/** Skins released this patch as splash cards with their name and rarity. */
export function NewSkins() {
	const { data, isLoading, isError } = useNewSkins();

	return (
		<Panel>
			<PanelHeader title="New skins" actions={data && <span className="text-xs text-muted-foreground">Patch {data.patch}</span>} />
			{isLoading ? (
				<div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="aspect-video" />
					))}
				</div>
			) : isError || !data || data.skins.length === 0 ? (
				<EmptyState title="No new skins this patch" />
			) : (
				<ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
					{data.skins.map((skin) => (
						<li key={skin.id} className="group relative aspect-video overflow-hidden rounded-md border">
							<img src={skin.splash} alt={skin.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
							<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent px-3 pb-2 pt-6">
								<p className="truncate text-sm font-semibold text-foreground">{skin.name}</p>
								{rarityLabel(skin.rarity) && <p className="text-2xs text-gold">{rarityLabel(skin.rarity)}</p>}
							</div>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
