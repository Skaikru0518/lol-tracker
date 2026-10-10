import { MatchDetail } from "@/components/match/match-detail";

/** Match detail: the route only unwraps params; the page is one client island. */
export default async function MatchPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ puuid?: string }>;
}) {
	const { id } = await params;
	const { puuid } = await searchParams;
	return <MatchDetail matchId={id} puuid={puuid} />;
}
