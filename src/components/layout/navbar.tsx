"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import SummonerSearch from "@/components/search/summoner-search";

export default function Navbar() {
	const pathname = usePathname();
	const isHome = pathname === "/";

	return (
		<motion.header
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: "easeOut" }}
			className="fixed top-0 left-0 right-0 z-40 h-14 border-b backdrop-blur-md bg-background/80"
		>
			<div className="flex h-full items-center justify-between px-4 sm:px-6">
				<Link href="/" className="text-lg font-bold tracking-tight">
					<span className="text-primary">Summon</span>.gg
				</Link>

				{!isHome && (
					<div className="w-full max-w-sm">
						<SummonerSearch compact />
					</div>
				)}
			</div>
		</motion.header>
	);
}
