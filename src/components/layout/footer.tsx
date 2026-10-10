"use client";

import Link from "next/link";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";

/** Slim page footer with patch, links and the Riot legal notice. */
export default function Footer() {
	const { data: version } = useDDragonVersion();

	return (
		<footer className="mt-auto border-t bg-nav">
			<div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 py-4 text-2xs text-muted-foreground sm:px-6">
				<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
					<span className="font-medium text-foreground">Summon.gg</span>
					<span>Patch {version ?? "..."}</span>
					<Link href="/changelog" className="hover:text-foreground">
						Changelog
					</Link>
					<Link href="/policy" className="hover:text-foreground">
						Policy
					</Link>
					<span>&copy; {new Date().getFullYear()}</span>
				</div>
				<p className="text-center">
					Summon.gg isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
					views or opinions of Riot Games or anyone officially involved in
					producing or managing Riot Games properties.
				</p>
			</div>
		</footer>
	);
}
