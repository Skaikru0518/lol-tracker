import { Skeleton } from "@/components/ui/skeleton";

/** Shell placeholder while the server loads the profile. */
export default function SummonerLoading() {
	return (
		<div>
			<div className="border-b bg-card/40">
				<div className="mx-auto flex max-w-7xl items-end gap-4 px-4 pb-5 pt-20 sm:px-6">
					<Skeleton className="size-20 rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-5 w-56" />
					</div>
				</div>
			</div>
			<div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
				<Skeleton className="h-10 w-full" />
				<div className="grid gap-4 lg:grid-cols-[330px_1fr]">
					<Skeleton className="h-96" />
					<Skeleton className="h-96" />
				</div>
			</div>
		</div>
	);
}
