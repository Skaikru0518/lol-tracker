"use client";

import SummonerSearch from "@/components/search/summoner-search";
import SearchHistory from "@/components/search/search-history";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
	return (
		<div className="relative flex h-[calc(100vh-3.5rem-3rem)] flex-col items-center justify-center overflow-hidden px-4">
			{/* Background glow */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/5 blur-[120px]" />
				<div className="absolute right-1/4 bottom-1/3 size-[400px] rounded-full bg-primary/3 blur-[100px]" />
			</div>

			<div className="relative z-10 flex flex-col items-center gap-8">
				<motion.div
					initial={{ opacity: 0, y: -30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, ease: "easeOut" }}
					className="text-center"
				>
					<div className="relative inline-block">
						<div className="absolute inset-0 blur-2xl animate-smoke opacity-40">
							<div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-cyan-400/40 to-primary/60 rounded-full" />
						</div>
						<h1 className="relative text-5xl font-bold tracking-tight sm:text-6xl">
							<span className="text-primary">Summon</span>.gg
						</h1>
					</div>
					<p className="mt-3 text-base text-muted-foreground">
						Search any summoner to view their ranked stats and match history
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
					className="w-full max-w-xl"
				>
					<SummonerSearch />
					<div className="mt-4">
						<SearchHistory />
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.4 }}
					className="flex flex-col items-center gap-3"
				>
					<div className="flex gap-6 text-sm text-muted-foreground">
						<span>Ranked Stats</span>
						<span className="text-border">·</span>
						<span>Match History</span>
						<span className="text-border">·</span>
						<span>Champion Mastery</span>
					</div>
					<Link
						href="/changelog"
						className="mt-4 text-sm text-primary/70 hover:text-primary transition-colors"
					>
						View recent changes →
					</Link>
				</motion.div>
			</div>
		</div>
	);
}
