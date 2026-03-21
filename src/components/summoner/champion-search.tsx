"use client";

import { useState, useMemo } from "react";
import { type Champion } from "@/lib/icon-helpers";
import { getChampionIcon } from "@/lib/icon-helpers";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface ChampionSearchProps {
	champions?: Record<number, Champion>;
	version?: string;
	summonerSlug: string;
}

export default function ChampionSearch({
	champions,
	version,
	summonerSlug,
}: ChampionSearchProps) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const router = useRouter();

	const filtered = useMemo(() => {
		if (!champions || !query.trim()) return [];
		const q = query.toLowerCase();
		return Object.values(champions)
			.filter((c) => c.name.toLowerCase().includes(q))
			.slice(0, 8);
	}, [champions, query]);

	function handleSelect(champ: Champion) {
		setQuery("");
		setOpen(false);
		router.push(`/summoner/${summonerSlug}/${champ.id}`);
	}

	return (
		<div className="relative">
			<Input
				value={query}
				onChange={(e) => {
					setQuery(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onBlur={() => setTimeout(() => setOpen(false), 200)}
				placeholder="Search champion..."
				className="h-12 text-sm bg-card border-border/50"
			/>
			{open && filtered.length > 0 && (
				<div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover p-1 shadow-lg">
					{filtered.map((champ) => (
						<button
							key={champ.key}
							onMouseDown={() => handleSelect(champ)}
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/30"
						>
							{version && (
								<Image
									src={getChampionIcon(version, champ.id)}
									alt={champ.name}
									width={28}
									height={28}
									className="rounded-lg"
								/>
							)}
							<span className="font-medium">{champ.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
