import { ChampionDetail } from "@/components/summoner/champions/champion-detail";

export default async function SummonerChampionPage({ params }: { params: Promise<{ name: string; champion: string }> }) {
	const { champion } = await params;
	return <ChampionDetail slug={champion} />;
}
