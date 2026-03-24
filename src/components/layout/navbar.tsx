"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SummonerSearch from "@/components/search/summoner-search";
import SearchHistory from "@/components/search/search-history";
import ThemeToggle from "@/components/ui/theme-toggle";
import { Search } from "lucide-react";

export default function Navbar() {
	const pathname = usePathname();
	const isHome = pathname === "/";
	const [spotlightOpen, setSpotlightOpen] = useState(false);

	// Close on Escape
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setSpotlightOpen(false);
		}
		if (spotlightOpen) {
			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
	}, [spotlightOpen]);

	// Close on route change
	useEffect(() => {
		setSpotlightOpen(false);
	}, [pathname]);

	// Lock body scroll when open
	useEffect(() => {
		if (spotlightOpen) {
			document.body.style.overflow = "hidden";
			return () => { document.body.style.overflow = ""; };
		}
	}, [spotlightOpen]);

	return (
		<>
			<motion.header
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
				className="fixed top-0 left-0 right-0 z-40 h-14 border-b backdrop-blur-md bg-background/80"
			>
				<div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
					<Link href="/" className="text-lg font-bold tracking-tight shrink-0">
						<span className="text-primary">Summon</span>.gg
					</Link>

					{!isHome && (
						<button
							onClick={() => setSpotlightOpen(true)}
							className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border/50 bg-card text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer max-w-sm w-full"
						>
							<Search className="size-3.5" />
							<span>Search summoner...</span>
							<kbd className="ml-auto hidden sm:inline text-[10px] text-muted-foreground/50 border border-border/30 rounded px-1.5 py-0.5">
								/
							</kbd>
						</button>
					)}

					<ThemeToggle />
				</div>
			</motion.header>

			{/* Spotlight overlay */}
			<AnimatePresence>
				{spotlightOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md"
							onClick={() => setSpotlightOpen(false)}
						/>

						{/* Search box */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: -20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: -20 }}
							transition={{ duration: 0.25, ease: "easeOut" }}
							className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
						>
							<div
								className="w-full max-w-lg pointer-events-auto"
								onClick={(e) => e.stopPropagation()}
							>
								<SummonerSearch autoFocus />
								<div className="mt-3">
									<SearchHistory />
								</div>
								<p className="mt-3 text-center text-sm text-muted-foreground/50">
									Press <kbd className="text-[10px] border border-border/30 rounded px-1.5 py-0.5">Esc</kbd> to close
								</p>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
