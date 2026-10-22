"use client";

import { useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { addSearchHistory } from "@/lib/home/search-history";
import { readPlatformPreference, subscribePlatformPreference, writePlatformPreference } from "@/lib/home/platform-preference";
import { DEFAULT_PLATFORM, type Platform } from "@/lib/game/platforms";
import { parseRiotId, toSummonerSlug } from "@/lib/game/riot-id";
import { locateSummoner } from "@/lib/summoner/search/locate-client";
import { useSummonerSuggestions } from "@/hooks/useSummonerSuggestions";
import { PlatformPicker } from "./platform-picker";
import { SearchSuggestions } from "./search-suggestions";

// Over the hero splash the fields need their own blurred backdrop to stay readable
const HERO_SURFACE = "bg-background/75 backdrop-blur-md border-primary/30 shadow-xl";

/** Riot ID search box with a server picker and as-you-type suggestions; the picked server is tried first. */
export default function SummonerSearch({
	compact,
	autoFocus,
	zoomOnFocus,
}: {
	compact?: boolean;
	autoFocus?: boolean;
	zoomOnFocus?: boolean;
}) {
	const [input, setInput] = useState("");
	const platform = useSyncExternalStore(subscribePlatformPreference, readPlatformPreference, () => DEFAULT_PLATFORM);
	const [locating, setLocating] = useState(false);
	const router = useRouter();
	const [focused, setFocused] = useState(false);
	const { results, pending, stale, isError, terms } = useSummonerSuggestions(input);

	async function go(gameName: string, tagLine: string, hint: Platform = platform) {
		setFocused(false);
		setLocating(true);
		try {
			const found = await locateSummoner(gameName, tagLine, hint);
			if (found) addSearchHistory({ riotId: `${gameName}#${tagLine}`, platform: found.platform });
			// Unknown Riot IDs still navigate, so the profile route shows its not-found page
			router.push(`/summoner/${found?.slug ?? toSummonerSlug(gameName, tagLine)}`);
		} catch {
			toast.error("Search is unavailable right now. Try again in a moment.");
		} finally {
			setLocating(false);
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const riotId = parseRiotId(input);
		if (!riotId) {
			toast.error("Use format: GameName#TAG");
			return;
		}

		void go(riotId.gameName, riotId.tagLine);
	}

	return (
		<form onSubmit={handleSubmit} className="flex w-full gap-2">
			<PlatformPicker value={platform} onChange={writePlatformPreference} compact={compact} className={zoomOnFocus ? HERO_SURFACE : undefined} />
			<div className={cn("relative flex-1", zoomOnFocus && "transition-transform duration-200 focus-within:scale-110")}>
				<Search
					className={`pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 size-4 text-muted-foreground ${compact ? "left-2.5 size-3.5" : ""}`}
				/>
				<Input
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						setFocused(true);
					}}
					placeholder="GameName#TAG"
					autoFocus={autoFocus}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					className={cn(
						"text-base border-border hover:border-muted-foreground/50 focus:border-primary/50 transition-colors",
						compact ? "h-9 pl-8" : "h-12 pl-10",
						zoomOnFocus ? HERO_SURFACE + " focus:bg-background/95" : "bg-card",
					)}
				/>
				{focused && terms && (
					<div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-left shadow-lg">
						<SearchSuggestions
							input={input}
							results={results}
							pending={pending}
							stale={stale}
							isError={isError}
							onPick={(gameName, tagLine, picked) => void go(gameName, tagLine, picked ?? platform)}
						/>
					</div>
				)}
			</div>
			<Button
				type="submit"
				size={compact ? "sm" : "lg"}
				disabled={locating}
				className={
					compact
						? "h-9 px-4 text-base font-semibold"
						: "h-12 px-8 text-base font-semibold bg-primary/30 text-white/80 backdrop-blur-sm border border-primary/60 hover:bg-primary/40 hover:border-primary/80"
				}
			>
				{locating ? <Loader2 className="size-4 animate-spin" /> : "Search"}
			</Button>
		</form>
	);
}
