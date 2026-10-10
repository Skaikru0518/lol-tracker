"use client";

import { AnimatePresence, motion } from "framer-motion";
import SummonerSearch from "@/components/search/summoner-search";
import SearchHistory from "@/components/search/search-history";
import { Panel } from "@/components/ui/panel";

/** Full-screen search overlay opened from the navbar or the `/` shortcut. */
export function SearchSpotlight({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	return (
		<AnimatePresence>
			{open && (
				<motion.div
					key="spotlight"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 pt-[18vh] backdrop-blur-sm"
					onClick={onClose}
				>
					<motion.div
						initial={{ y: -12 }}
						animate={{ y: 0 }}
						exit={{ y: -12 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className="w-full max-w-lg"
						onClick={(event) => event.stopPropagation()}
					>
						<Panel className="flex flex-col gap-3 p-4 shadow-xl">
							<SummonerSearch autoFocus />
							<SearchHistory />
							<p className="text-center text-xs text-muted-foreground">
								Press{" "}
								<kbd className="rounded border px-1.5 py-0.5 text-[10px]">Esc</kbd>{" "}
								to close
							</p>
						</Panel>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
