"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies `GameName#TAG` to the clipboard. */
export function CopyRiotId({ riotId }: { riotId: string }) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(riotId);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<button
			type="button"
			onClick={copy}
			title="Copy Riot ID"
			className="text-muted-foreground transition-colors hover:text-foreground"
		>
			{copied ? <Check className="size-4 text-win" /> : <Copy className="size-4" />}
		</button>
	);
}
