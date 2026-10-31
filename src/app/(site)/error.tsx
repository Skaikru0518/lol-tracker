"use client";

import Link from "next/link";
import { ErrorScreen } from "@/components/errors/error-screen";
import { Button } from "@/components/ui/button";

/** Route error boundary: Try again re-fetches and re-renders the segment (also after Server Component errors), Go home leaves it. */
export default function Error({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
	return (
		<ErrorScreen title="Something went wrong" description="The Riot API or our server did not respond. It usually works again in a moment.">
			<div className="flex gap-2">
				<Button onClick={() => unstable_retry()}>Try again</Button>
				<Button asChild variant="outline">
					<Link href="/">Go home</Link>
				</Button>
			</div>
		</ErrorScreen>
	);
}
