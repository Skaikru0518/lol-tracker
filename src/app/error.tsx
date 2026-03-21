"use client";

import { Button } from "@/components/ui/button";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
			<div className="text-center">
				<h1 className="text-6xl font-bold text-destructive">Error</h1>
				<p className="mt-3 text-lg text-muted-foreground">
					Something went wrong
				</p>
				<p className="mt-1 text-sm text-muted-foreground/70">
					{error.message}
				</p>
			</div>
			<Button onClick={reset} size="lg" className="h-12 px-8">
				Try Again
			</Button>
		</div>
	);
}
