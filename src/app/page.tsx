import { changelogs } from "@/components/changelog/registry";
import { FreeRotation } from "@/components/home/free-rotation";
import { HomeHero } from "@/components/home/home-hero";
import { NewSkins } from "@/components/home/new-skins";
import { RecentlySearched } from "@/components/home/recently-searched";
import { WhatsNew } from "@/components/home/whats-new";

/** Home (design B): hero search, then recently searched, free rotation and what's new, and this patch's new skins. */
export default function Home() {
	return (
		<>
			<HomeHero />
			<div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-3">
				<RecentlySearched />
				<FreeRotation />
				<WhatsNew entries={changelogs.slice(0, 2)} />
			</div>
			<div className="mx-auto max-w-6xl px-4 pb-10">
				<NewSkins />
			</div>
		</>
	);
}
