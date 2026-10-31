import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";
import Footer from "@/components/layout/footer";
import MaintenanceScreen from "@/components/layout/maintenance-screen";
import Navbar from "@/components/layout/navbar";
import { isMaintenanceMode } from "@/lib/server/app-settings";
import { QueryProvider } from "@/providers/query-providers";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	if (await isMaintenanceMode()) return <MaintenanceScreen />;

	return (
		<QueryProvider>
			<Toaster
				toastOptions={{
					style: {
						background: "var(--card)",
						color: "var(--card-foreground)",
						border: "1px solid var(--border)",
						fontSize: "14px",
					},
				}}
			/>
			<Navbar />
			<main className="flex-1 pt-14">{children}</main>
			<Analytics />
			<Footer />
		</QueryProvider>
	);
}
