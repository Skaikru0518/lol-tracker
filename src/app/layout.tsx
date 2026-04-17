import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-providers";
import ThemeProvider from "@/providers/theme-provider";
import { Toaster } from "react-hot-toast";
import AuroraBackground from "@/components/ui/aurora-background";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

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
	metadataBase: new URL("https://summon-gg.vercel.app"),
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
		url: "https://summon-gg.vercel.app",
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
	const maintenance = process.env.MAINTENANCE_MODE === "true";

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
				<ThemeProvider>
					{maintenance ? (
						<div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
							<div className="text-center space-y-4 px-6">
								<div className="text-6xl">🔧</div>
								<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
									Under Maintenance
								</h1>
								<p className="text-lg text-muted-foreground max-w-md">
									We&apos;re migrating to a new database. Be right back!
								</p>
							</div>
						</div>
					) : (
						<>
							<AuroraBackground />
							<QueryProvider>
								<Toaster
									toastOptions={{
										style: {
											background: "hsl(220 20% 12%)",
											color: "hsl(40 20% 90%)",
											border: "1px solid hsl(220 15% 20%)",
											fontSize: "14px",
										},
									}}
								/>
								<Navbar />
								<main className="flex-1 pt-14 pb-12">{children}</main>
								<Analytics />
								<Footer />
							</QueryProvider>
						</>
					)}
				</ThemeProvider>
			</body>
		</html>
	);
}
