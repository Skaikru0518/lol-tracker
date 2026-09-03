"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { getSearchHistory, clearSearchHistory } from "@/lib/search-history";
import { parseRiotId, toSummonerSlug } from "@/lib/riot-id";

export default function SearchHistory() {
	const [history, setHistory] = useState<string[]>([]);

	useEffect(() => {
		setHistory(getSearchHistory());
	}, []);

	if (history.length === 0) return null;

	function handleClear() {
		clearSearchHistory();
		setHistory([]);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="text-sm text-muted-foreground">Recent:</span>
			{history.map((item) => {
				const riotId = parseRiotId(item);
				if (!riotId) return null;
				return (
					<Link
						key={item}
						href={`/summoner/${toSummonerSlug(riotId.gameName, riotId.tagLine)}`}
						className="inline-flex items-center rounded-full border border-border/50 bg-card/50 px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
					>
						{item}
					</Link>
				);
			})}
			<button
				onClick={handleClear}
				className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<X className="size-3" />
				Clear
			</button>
		</div>
	);
}
