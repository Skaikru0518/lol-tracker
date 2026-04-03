"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
	const router = useRouter();

	return (
		<button
			onClick={() => router.back()}
			className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
		>
			<ArrowLeft className="size-4" />
			<span>Back</span>
		</button>
	);
}
