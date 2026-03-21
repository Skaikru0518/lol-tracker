"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SidebarSkeleton() {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<Skeleton className="h-4 w-16" />
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-4">
						<Skeleton className="size-16 rounded-2xl" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-3 w-20" />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<Skeleton className="h-4 w-24" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4">
							<Skeleton className="size-12 rounded-xl" />
							<div className="space-y-1.5 flex-1">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-3 w-28" />
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
