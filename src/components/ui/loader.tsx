"use client";

import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { useIsClient } from "@/hooks/useIsClient";

function Dots({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center justify-center gap-1.5", className)}>
			{[0, 1, 2].map((index) => (
				<motion.span
					key={index}
					className="size-2 rounded-full bg-primary"
					animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
					transition={{ duration: 1, repeat: Infinity, delay: index * 0.15 }}
				/>
			))}
		</div>
	);
}

function FullScreenLoader() {
	const isClient = useIsClient();
	if (!isClient) return null;

	return createPortal(
		<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background">
			<Logo className="text-4xl" />
			<Dots />
		</div>,
		document.body,
	);
}

/** Inline dots loader, or a full-screen one with `fullScreen`. */
export default function Loader({
	fullScreen,
	className,
}: {
	fullScreen?: boolean;
	className?: string;
}) {
	if (fullScreen) return <FullScreenLoader />;
	return <Dots className={cn("[&>span]:bg-muted-foreground", className)} />;
}
