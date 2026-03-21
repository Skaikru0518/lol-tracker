"use client";

import SummonerSearch from "@/components/search/summoner-search";
import { motion } from "framer-motion";

export default function Home() {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
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
					<h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
						<span className="text-primary">LoL</span> Tracker
					</h1>
					<p className="mt-3 text-base text-muted-foreground">
						Search any summoner to view their ranked stats and match
						history
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
					className="w-full max-w-lg"
				>
					<SummonerSearch />
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.4 }}
					className="flex gap-6 text-xs text-muted-foreground"
				>
					<span>Ranked Stats</span>
					<span className="text-border">·</span>
					<span>Match History</span>
					<span className="text-border">·</span>
					<span>Champion Mastery</span>
				</motion.div>
			</div>
		</div>
	);
}
