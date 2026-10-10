"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import ThemeToggle from "@/components/ui/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { SearchSpotlight } from "@/components/layout/search-spotlight";
import { isTypingTarget } from "@/lib/ui/keyboard";
import { reconcileOpenedOn } from "@/lib/ui/spotlight";

/** Fixed top bar: logo, search trigger (not on home), theme toggle. */
export default function Navbar() {
	const pathname = usePathname();
	const isHome = pathname === "/";
	const [openedOn, setOpenedOn] = useState<string | null>(null);
	const reconciled = reconcileOpenedOn(openedOn, pathname);
	if (reconciled !== openedOn) setOpenedOn(reconciled); // render-time reset, React-sanctioned
	const spotlightOpen = reconciled !== null;

	const openSpotlight = useCallback(() => setOpenedOn(pathname), [pathname]);
	const closeSpotlight = useCallback(() => setOpenedOn(null), []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				closeSpotlight();
				return;
			}
			if (
				event.key === "/" &&
				!isHome &&
				!isTypingTarget(event.target as HTMLElement | null)
			) {
				event.preventDefault();
				openSpotlight();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isHome, openSpotlight, closeSpotlight]);

	useEffect(() => {
		if (!spotlightOpen) return;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, [spotlightOpen]);

	return (
		<>
			<header className="fixed inset-x-0 top-0 z-40 h-14 border-b bg-nav/90 backdrop-blur">
				<div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
					<Link href="/" className="shrink-0 text-lg">
						<Logo />
					</Link>

					{isHome ? (
						<div className="flex-1" />
					) : (
						<button
							type="button"
							onClick={openSpotlight}
							className="mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
						>
							<Search className="size-3.5" />
							<span>Search summoner...</span>
							<kbd className="ml-auto hidden rounded border px-1.5 py-0.5 text-[10px] sm:inline">
								/
							</kbd>
						</button>
					)}

					<ThemeToggle />
				</div>
			</header>

			<SearchSpotlight open={spotlightOpen} onClose={closeSpotlight} />
		</>
	);
}
