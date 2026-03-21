"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search } from "lucide-react";

export default function SummonerSearch() {
	const [input, setInput] = useState("");
	const router = useRouter();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const [gameName, tagLine] = input.split("#");
		if (!gameName || !tagLine) {
			toast.error("Use format: GameName#TAG");
			return;
		}

		router.push(`/summoner/${gameName}-${tagLine}`);
	}

	return (
		<form onSubmit={handleSubmit} className="flex w-full gap-2">
			<div className="relative flex-1">
				<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
				<Input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="GameName#TAG"
					className="h-12 pl-10 text-sm bg-card border-border/50 focus:border-primary/50 transition-colors"
				/>
			</div>
			<Button
				type="submit"
				size="lg"
				className="h-12 px-8 font-semibold"
			>
				Search
			</Button>
		</form>
	);
}
