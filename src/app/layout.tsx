import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import ThemeProvider from "@/providers/theme-provider";
import { SITE_URL } from "@/lib/shared/site";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: {
		default: "Summon.gg — League of Legends Summoner Tracker",
		template: "%s | Summon.gg",
	},
	description:
		"Track any League of Legends summoner — ranked stats, LP history, match history, champion mastery, live game detection, achievement badges, and detailed match breakdowns. Free and open alternative to op.gg.",
	keywords: [
		"League of Legends",
		"LoL",
		"summoner",
		"tracker",
		"match history",
		"ranked",
		"stats",
		"op.gg",
		"u.gg",
		"LP tracker",
		"live game",
		"champion mastery",
		"KDA",
		"league tracker",
		"summoner lookup",
		"LoL stats",
	],
	authors: [{ name: "Skaikru0518" }],
	creator: "Skaikru0518",
	metadataBase: new URL(SITE_URL),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Summon.gg",
		title: "Summon.gg — League of Legends Summoner Tracker",
		description:
			"Track any League of Legends summoner — ranked stats, LP history, match history, champion mastery, live game detection, and achievement badges.",
		url: SITE_URL,
		images: [{ url: "/icon.ico" }],
	},
	twitter: {
		card: "summary",
		title: "Summon.gg — League of Legends Summoner Tracker",
		description:
			"Track any LoL summoner — ranked stats, LP history, match history, live game detection, and achievement badges.",
		images: ["/icon.ico"],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	icons: {
		icon: [
			{ url: "/favicon.svg", type: "image/svg+xml" },
			{ url: "/icon.ico", sizes: "any" },
			{ url: "favicon.ico", sizes: "any" },
		],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={cn(
				"h-full",
				"antialiased",
				geistSans.variable,
				geistMono.variable,
			)}
			suppressHydrationWarning
		>
			<body className="min-h-full flex flex-col font-sans scroll-smooth">
				<ThemeProvider>{children}</ThemeProvider>
			</body>
		</html>
	);
}
