import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
			<div className="text-center">
				<h1 className="text-7xl font-bold text-primary">404</h1>
				<p className="mt-3 text-lg text-muted-foreground">
					Page not found
				</p>
				<p className="mt-1 text-sm text-muted-foreground/70">
					The page you&apos;re looking for doesn&apos;t exist
				</p>
			</div>
			<Button asChild size="lg" className="h-12 px-8">
				<Link href="/">Go Home</Link>
			</Button>
		</div>
	);
}
