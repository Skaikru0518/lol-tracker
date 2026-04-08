"use client";

import { useEffect } from "react";
import {
	useAchievements,
	useDetectAchievements,
} from "@/hooks/useAchievements";
import { ACHIEVEMENTS } from "@/lib/achievements/definitions";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface AchievementBarProps {
	puuid: string;
}

export default function AchievementBar({ puuid }: AchievementBarProps) {
	const { data: savedAchievements } = useAchievements(puuid);
	const detect = useDetectAchievements();

	// Trigger detection on mount
	useEffect(() => {
		if (puuid) {
			detect.mutate({ puuid });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [puuid]);

	const earnedIds = new Set(
		savedAchievements?.map((a) => a.achievementId) ?? [],
	);
	const earned = ACHIEVEMENTS.filter((a) => earnedIds.has(a.id));

	if (earned.length === 0) return null;

	return (
		<TooltipProvider delayDuration={200}>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.15 }}
				className="mb-4 w-full"
			>
				<div className="flex flex-wrap gap-2">
					{earned.map((achievement, i) => (
						<Tooltip key={achievement.id}>
							<TooltipTrigger asChild>
								<Badge
									asChild
									variant="outline"
									className="h-auto px-3 py-1.5 text-sm cursor-pointer"
									style={{ color: achievement.color, borderColor: `${achievement.color}44`, backgroundColor: `${achievement.color}20` }}
								>
									<motion.span
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ duration: 0.2, delay: i * 0.05 }}
									>
										{achievement.name}
									</motion.span>
								</Badge>
							</TooltipTrigger>
							<TooltipContent>
								<p>{achievement.description}</p>
							</TooltipContent>
						</Tooltip>
					))}
				</div>
			</motion.div>
		</TooltipProvider>
	);
}
