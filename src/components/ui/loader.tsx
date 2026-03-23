"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface LoaderProps {
	fullScreen?: boolean;
	className?: string;
}

function FullScreenLoader() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return createPortal(
		<motion.div
			initial={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
		>
			<div className="text-center">
				<h1 className="text-4xl font-bold tracking-tight">
					<span className="text-primary">Summon</span>.gg
				</h1>
				<div className="mt-6 flex items-center justify-center gap-1.5">
					{[0, 1, 2].map((i) => (
						<motion.div
							key={i}
							className="size-2 rounded-full bg-primary"
							animate={{
								opacity: [0.3, 1, 0.3],
								scale: [0.8, 1.1, 0.8],
							}}
							transition={{
								duration: 1,
								repeat: Infinity,
								delay: i * 0.15,
							}}
						/>
					))}
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}

export default function Loader({ fullScreen, className }: LoaderProps) {
	if (fullScreen) return <FullScreenLoader />;

	return (
		<div
			className={cn(
				"flex items-center justify-center gap-2",
				className,
			)}
		>
			{[0, 1, 2].map((i) => (
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
