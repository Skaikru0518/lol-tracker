"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function StatsSkeleton() {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<Skeleton className="h-4 w-20" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<Skeleton className="h-16 rounded-lg" />
						<Skeleton className="h-16 rounded-lg" />
					</div>
					<div className="grid grid-cols-4 gap-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-12 rounded-lg" />
						))}
					</div>
					<Skeleton className="h-5 w-full rounded-full" />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<Skeleton className="h-4 w-16" />
				</CardHeader>
				<CardContent className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="space-y-1.5">
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-1.5 w-full rounded-full" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
