"use client";

import { useMemo } from "react";
import { type Match } from "@/lib/validators/match";
import { calculateStats } from "@/lib/match-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RolesCardProps {
	matches?: Match[];
	puuid: string;
}

export default function RolesCard({ matches, puuid }: RolesCardProps) {
	const stats = useMemo(
		() => (matches ? calculateStats(matches, puuid) : null),
		[matches, puuid],
	);

	if (!stats || stats.totalGames === 0) return null;

	const sortedRoles = Object.entries(stats.roles).sort(([, a], [, b]) => b - a);
	const maxRoleCount = sortedRoles[0]?.[1] ?? 1;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Roles
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{sortedRoles.map(([role, count]) => (
					<div key={role}>
						<div className="flex items-center justify-between mb-1">
							<span className="text-sm font-medium">{role}</span>
							<span className="text-sm text-muted-foreground">
								{count} ({Math.round((count / stats.totalGames) * 100)}%)
							</span>
						</div>
						<div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className="bg-primary rounded-full transition-all"
								style={{
									width: `${(count / maxRoleCount) * 100}%`,
								}}
							/>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
