"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LoaderMini({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center justify-center gap-1.5", className)}>
			{[0, 1, 2].map((i) => (
				<motion.div
					key={i}
					className="size-2 rounded-full bg-primary"
					animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
					transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
				/>
			))}
		</div>
	);
}
