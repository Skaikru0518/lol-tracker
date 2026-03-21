import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-providers";
import LenisProvider from "@/providers/lenis-provider";
import { Toaster } from "react-hot-toast";
import AuroraBackground from "@/components/ui/aurora-background";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "LoL Tracker",
	description: "League of Legends profile and match tracker",
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
				"dark",
				"h-full",
				"antialiased",
				geistSans.variable,
				geistMono.variable,
			)}
		>
			<body className="min-h-full flex flex-col font-sans">
				<AuroraBackground />
				<LenisProvider>
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
						{children}
					</QueryProvider>
				</LenisProvider>
			</body>
		</html>
	);
}
