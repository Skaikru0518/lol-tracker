import { notFound } from "next/navigation";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { StatRing } from "@/components/ui/stat-ring";
import { HeroBanner } from "@/components/ui/hero-banner";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
import { SpellRuneStack } from "@/components/ui/spell-rune-stack";
import { Button } from "@/components/ui/button";
import { getChampionSplash, getDDragonVersion } from "@/lib/icon-helpers";

/** Dev-only gallery of the redesign primitives; 404 in production. */
export default async function UiGalleryPage() {
	if (process.env.NODE_ENV === "production") notFound();

	const version = await getDDragonVersion();

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
			<HeroBanner splashUrl={getChampionSplash("Nami")} className="rounded-lg">
				<div className="flex h-40 items-end gap-4 p-6">
					<ChampionIcon version={version} championName="Nami" size={64} level={18} />
					<div>
						<h1 className="text-2xl font-bold text-foreground">Hero banner</h1>
						<div className="mt-2 flex gap-1.5">
							<Chip color="#34c38f">EMERALD I · SOLO</Chip>
							<Chip color="#4fb3c9">PLATINUM I · FLEX</Chip>
							<Chip color="#fff">short hex</Chip>
							<Chip color="red">invalid</Chip>
						</div>
					</div>
				</div>
			</HeroBanner>

			<div className="grid gap-4 md:grid-cols-2">
				<Panel>
					<PanelHeader title="Ranked Solo" actions={<Button size="sm">Update</Button>} />
					<PanelBody className="flex items-center gap-4">
						<RankEmblem tier="EMERALD" size={64} />
						<RankEmblem tier="" size={40} />
						<RankEmblem tier="emerald" size={40} />
					</PanelBody>
				</Panel>

				<Panel>
					<PanelHeader title="Match primitives" />
					<PanelBody className="flex items-center gap-3">
						<ChampionIcon version={version} championName="MissFortune" size={44} level={14} />
						<SpellRuneStack version={version} spells={[4, 7]} runes={[null, null]} />
						<ItemSlots version={version} items={[3031, 6672, 3006, 3094, 3036, 0, 3363]} />
					</PanelBody>
				</Panel>

				<Panel>
					<PanelHeader title="Stat rings" />
					<PanelBody className="flex justify-around">
						<StatRing label="Dmg share" value={21.5} display="21.5%" />
						<StatRing label="KP" value={45} display="45%" color="var(--win)" />
						<StatRing label="CS/min" value={7.4} max={10} display="7.4" />
						<StatRing label="Overflow" value={250} display="250" />
						<StatRing label="NaN" value={Number.NaN} display="-" />
					</PanelBody>
				</Panel>

				<Panel>
					<PanelHeader title="Empty state" />
					<EmptyState
						title="No matches found"
						description="This summoner has no stored matches for this queue."
						action={<Button size="sm" variant="outline">Retry</Button>}
					/>
				</Panel>
			</div>
		</div>
	);
}
