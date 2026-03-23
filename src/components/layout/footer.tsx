"use client";

import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import Link from "next/link";

export default function Footer() {
	const { data: version } = useDDragonVersion();

	return (
		<footer className="fixed bottom-0 left-0 right-0 z-40 border-t py-1.5 backdrop-blur-md bg-background/80">
			<div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
				<span className="font-medium">Summon.gg</span>
				<span>·</span>
				<span>LoL Patch {version ?? "..."}</span>
				<span>·</span>
				<Link href={"/changelog"}>Changes</Link>
				<span>·</span>
				<span>© {new Date().getFullYear()}</span>
			</div>
		</footer>
	);
}
