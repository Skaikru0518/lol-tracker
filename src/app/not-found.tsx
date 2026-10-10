import Link from "next/link";
import { ErrorScreen } from "@/components/errors/error-screen";
import SummonerSearch from "@/components/search/summoner-search";
import { Button } from "@/components/ui/button";

/** 404: Teemo splash, a short line, Go home and a summoner search. */
export default function NotFound() {
	return (
		<ErrorScreen code="404" title="This page vanished into the fog of war" description="The link may be old, or the page never existed." splash="Teemo">
			<Button asChild>
				<Link href="/">Go home</Link>
			</Button>
			<div className="w-full max-w-md rounded-xl border bg-background/85 p-3 backdrop-blur-md">
				<SummonerSearch compact />
			</div>
		</ErrorScreen>
	);
}
