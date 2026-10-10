"use client";

import { Loader2, Search } from "lucide-react";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { recentSearchRank } from "@/lib/home/format";
import { getSummonerIcon, RANK_COLORS } from "@/lib/icon-helpers";
import { lookupCandidate } from "@/lib/summoner/search-query";
import { suggestionStatus } from "@/lib/summoner/search-results";
import { cn } from "@/lib/utils";
import { type RecentSearch } from "@/lib/validators/recent-searches";

/** Dropdown of stored summoners matching the typed text, a "Searching…" row while waiting, and a Riot lookup row for an unknown full Riot ID. */
export function SearchSuggestions({
	input,
	results,
	pending,
	isError,
	onPick,
}: {
	input: string;
	results: RecentSearch[];
	pending: boolean;
	isError: boolean;
	onPick: (gameName: string, tagLine: string) => void;
}) {
	const { data: version } = useDDragonVersion();
	const lookup = pending ? null : lookupCandidate(input, results);
	const status = suggestionStatus({ pending, isError, resultCount: results.length, hasLookup: !!lookup });

	return (
		<ul className="max-h-80 overflow-y-auto py-1" onMouseDown={(e) => e.preventDefault()}>
			{pending && (
				<li className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
					<Loader2 className="size-3.5 animate-spin" />
					Searching…
				</li>
			)}
			{results.map((r) => (
				<li key={r.puuid} className={cn(pending && "pointer-events-none opacity-60")}>
					<button
						type="button"
						onClick={() => onPick(r.gameName, r.tagLine)}
						className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-accent/50"
					>
						{version && r.profileIconId !== null ? (
							<img src={getSummonerIcon(version, r.profileIconId)} alt="" width={24} height={24} className="size-6 rounded" />
						) : (
							<span className="size-6 rounded bg-muted" />
						)}
						<span className="min-w-0 flex-1 truncate text-sm text-foreground">
							{r.gameName}
							<span className="text-muted-foreground">#{r.tagLine}</span>
						</span>
						<span className="text-xs" style={{ color: r.soloTier ? RANK_COLORS[r.soloTier] : undefined }}>
							{recentSearchRank(r)}
						</span>
					</button>
				</li>
			))}
			{lookup && (
				<li>
					<button
						type="button"
						onClick={() => onPick(lookup.gameName, lookup.tagLine)}
						className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-primary transition-colors hover:bg-accent/50"
					>
						<Search className="size-4" />
						Look up {lookup.gameName}#{lookup.tagLine}
					</button>
				</li>
			)}
			{status === "error" && <li className="px-3 py-1.5 text-xs text-loss">Search is unavailable right now. Type the full Name#TAG and press Search.</li>}
			{status === "empty" && <li className="px-3 py-1.5 text-xs text-muted-foreground">No stored summoner matches. Type the full Name#TAG.</li>}
		</ul>
	);
}
