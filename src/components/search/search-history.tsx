"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { clearSearchHistory } from "@/lib/search-history";
import { parseRiotId, toSummonerSlug } from "@/lib/riot-id";
import { useSearchHistory } from "@/hooks/useSearchHistory";

/** Recent searches as chips linking to each profile, with a clear action. */
export default function SearchHistory() {
	const history = useSearchHistory();

	if (history.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{history.map((item) => {
				const riotId = parseRiotId(item);
				if (!riotId) return null;
				return (
					<Link
						key={item}
						href={`/summoner/${toSummonerSlug(riotId.gameName, riotId.tagLine)}`}
						className="inline-flex h-7 items-center rounded-full border bg-card px-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
					>
						{item}
					</Link>
				);
			})}
			<button
				type="button"
				onClick={clearSearchHistory}
				className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				<X className="size-3" />
				Clear
			</button>
		</div>
	);
}
