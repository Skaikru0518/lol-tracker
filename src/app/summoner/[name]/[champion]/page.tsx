import { permanentRedirect } from "next/navigation";
import { legacyChampionPath } from "@/lib/summoner/champion-slug";

/** Pre-redesign champion URLs moved under /champions. */
export default async function LegacyChampionRedirect({ params }: { params: Promise<{ name: string; champion: string }> }) {
	const { name, champion } = await params;
	permanentRedirect(legacyChampionPath(name, champion));
}
