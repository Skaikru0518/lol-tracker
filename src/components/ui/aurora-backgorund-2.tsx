"use client";

import { useState, useEffect } from "react";
import Aurora from "@/components/Aurora";
import { motion, AnimatePresence } from "framer-motion";

function useGpuCheck(): "full" | "fallback" | "checking" {
	const [result, setResult] = useState<"full" | "fallback" | "checking">(
		"checking",
	);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setResult("fallback");
			return;
		}

		let frames = 0;
		let lastTime = performance.now();
		let animId: number;

		function measure(now: number) {
			frames++;
			if (now - lastTime >= 1000) {
				setResult(frames < 30 ? "fallback" : "full");
				return;
			}
			animId = requestAnimationFrame(measure);
		}

		animId = requestAnimationFrame(measure);
		return () => cancelAnimationFrame(animId);
	}, []);

	return result;
}

function StaticBackground() {
	return (
		<div
			className="absolute inset-0"
			style={{
				background: `
					radial-gradient(ellipse 80% 60% at 20% 50%, rgba(10,177,199,0.12) 0%, transparent 70%),
					radial-gradient(ellipse 60% 80% at 80% 50%, rgba(225,0,255,0.08) 0%, transparent 70%),
					radial-gradient(ellipse 100% 100% at 50% 100%, rgba(10,177,199,0.05) 0%, transparent 50%)
				`,
			}}
		/>
	);
}

export default function AuroraBackground2() {
	const gpu = useGpuCheck();

	return (
		<>
			{/* Splash screen while checking GPU */}
			<AnimatePresence>
				{gpu === "checking" && (
					<motion.div
						exit={{ opacity: 0 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
						className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.4 }}
							className="text-center"
						>
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
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Background */}
			<div className="fixed inset-0 -z-10 overflow-hidden">
				{gpu === "full" ? (
					<Aurora
						speed={0.3}
						scale={1}
						brightness={0.5}
						color1="#0ab1c7"
						color2="#e100ff"
						noiseFrequency={2}
						noiseAmplitude={1}
						bandHeight={0.5}
						bandSpread={1}
						octaveDecay={0.1}
						layerOffset={0}
						colorSpeed={2}
						enableMouseInteraction={false}
						mouseInfluence={0.25}
					/>
				) : (
					<StaticBackground />
				)}
			</div>
		</>
	);
}
