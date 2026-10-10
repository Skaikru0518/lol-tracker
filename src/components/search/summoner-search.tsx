"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { addSearchHistory } from "@/lib/home/search-history";
import { parseRiotId, toSummonerSlug } from "@/lib/game/riot-id";
import { useSummonerSuggestions } from "@/hooks/useSummonerSuggestions";
import { SearchSuggestions } from "./search-suggestions";

/** Riot ID search box with as-you-type suggestions from stored summoners; Enter or Search opens the typed Riot ID. */
export default function SummonerSearch({
	compact,
	autoFocus,
}: {
	compact?: boolean;
	autoFocus?: boolean;
}) {
	const [input, setInput] = useState("");
	const router = useRouter();
	const [focused, setFocused] = useState(false);
	const { results, pending, stale, isError, terms } = useSummonerSuggestions(input);

	function go(gameName: string, tagLine: string) {
		addSearchHistory(`${gameName}#${tagLine}`);
		setFocused(false);
		router.push(`/summoner/${toSummonerSlug(gameName, tagLine)}`);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const riotId = parseRiotId(input);
		if (!riotId) {
			toast.error("Use format: GameName#TAG");
			return;
		}

		go(riotId.gameName, riotId.tagLine);
	}

	return (
		<form onSubmit={handleSubmit} className="flex w-full gap-2">
			<div className="relative flex-1">
				<Search
					className={`absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground ${compact ? "left-2.5 size-3.5" : ""}`}
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
					className={
						compact
							? "h-9 pl-8 text-base bg-card border-border hover:border-muted-foreground/50 focus:border-primary/50 transition-colors"
							: "h-12 pl-10 text-base bg-card border-border hover:border-muted-foreground/50 focus:border-primary/50 transition-colors"
					}
				/>
				{focused && terms && (
					<div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-left shadow-lg">
						<SearchSuggestions input={input} results={results} pending={pending} stale={stale} isError={isError} onPick={go} />
					</div>
				)}
			</div>
			<Button
				type="submit"
				size={compact ? "sm" : "lg"}
				className={
					compact
						? "h-9 px-4 text-base font-semibold"
						: "h-12 px-8 text-base font-semibold bg-primary/30 text-white/80 backdrop-blur-sm border border-primary/60 hover:bg-primary/40 hover:border-primary/80"
				}
			>
				Search
			</Button>
		</form>
	);
}
