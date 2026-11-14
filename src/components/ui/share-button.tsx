"use client";

import { Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

/** Shares a site path: the native share sheet where there is one, else the clipboard. */
export function ShareButton({ path, title, className }: { path: string; title: string; className?: string }) {
	async function share(event: React.MouseEvent) {
		// Sits inside clickable rows and cards
		event.stopPropagation();
		event.preventDefault();
		const url = `${window.location.origin}${path}`;
		if (navigator.share) {
			await navigator.share({ url, title }).catch(() => {});
			return;
		}
		await navigator.clipboard.writeText(url);
		toast.success("Link copied");
	}

	return (
		<Button type="button" variant="ghost" size="icon-sm" aria-label="Share" title="Share" className={className} onClick={share}>
			<Share2 />
		</Button>
	);
}
