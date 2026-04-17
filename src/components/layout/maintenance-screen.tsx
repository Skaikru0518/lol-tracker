"use client";

import { motion } from "framer-motion";

export default function MaintenanceScreen() {
	return (
		<div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-background px-4">
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
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
					className="flex flex-col items-center gap-4 text-center"
				>
					<div className="flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-primary" />
						</span>
						<span className="text-sm font-medium text-primary">
							Under Maintenance
						</span>
					</div>

					<h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
						We&apos;re migrating to a new database
					</h2>
					<p className="max-w-md text-base text-muted-foreground">
						The site will be back shortly. Thanks for your patience!
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.4 }}
					className="flex gap-6 text-sm text-muted-foreground"
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
