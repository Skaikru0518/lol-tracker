"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoaderProps {
	fullScreen?: boolean;
	className?: string;
}

export default function Loader({ fullScreen, className }: LoaderProps) {
	const dots = [0, 1, 2];
	return (
		<div
			className={cn(
				"flex items-center justify-center gap-2",
				fullScreen && "fixed inset-0 bg-background/80 backdrop-blur-sm z-50",
				className,
			)}
		>
			{dots.map((i) => (
				<motion.div
					key={i}
					className="size-2 rounded-full bg-muted-foreground"
					animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
					transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
				/>
			))}
		</div>
	);
}
