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
		default: "Summon.gg",
		template: "%s | Summon.gg",
	},
	description:
		"Track any League of Legends summoner — ranked stats, match history, champion mastery, live game detection, and detailed match breakdowns.",
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
	],
	authors: [{ name: "Skaikru0518" }],
	creator: "Skaikru0518",
	metadataBase: new URL("https://summon-gg.vercel.app"),
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Summon.gg",
		title: "Summon.gg",
		description:
			"Track any League of Legends summoner — ranked stats, match history, champion mastery, and live game detection.",
	},
	twitter: {
		card: "summary",
		title: "Summon.gg",
		description:
			"League of Legends summoner tracker with ranked stats, match history, and live game detection.",
	},
	robots: {
		index: true,
		follow: true,
	},
	icons: {
		icon: [
			{ url: "/favicon.svg", type: "image/svg+xml" },
			{ url: "/icon.ico", sizes: "any" },
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
				<ThemeProvider>
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
						<Footer />
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
