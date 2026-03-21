"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { addSearchHistory } from "@/lib/search-history";

export default function SummonerSearch({ compact, autoFocus }: { compact?: boolean; autoFocus?: boolean }) {
	const [input, setInput] = useState("");
	const router = useRouter();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const [gameName, tagLine] = input.split("#");
		if (!gameName || !tagLine) {
			toast.error("Use format: GameName#TAG");
			return;
		}

		addSearchHistory(`${gameName}#${tagLine}`);
		router.push(`/summoner/${gameName}-${tagLine}`);
	}

	return (
		<form onSubmit={handleSubmit} className="flex w-full gap-2">
			<div className="relative flex-1">
				<Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground ${compact ? "left-2.5 size-3.5" : ""}`} />
				<Input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="GameName#TAG"
					autoFocus={autoFocus}
					className={compact
						? "h-9 pl-8 text-sm bg-card border-border/50 focus:border-primary/50 transition-colors"
						: "h-12 pl-10 text-sm bg-card border-border/50 focus:border-primary/50 transition-colors"
					}
				/>
			</div>
			<Button
				type="submit"
				size={compact ? "sm" : "lg"}
				className={compact ? "h-9 px-4 text-sm font-semibold" : "h-12 px-8 text-base font-semibold"}
			>
				Search
			</Button>
		</form>
	);
}
