import { Suspense } from "react";
import { DuoTab } from "@/components/summoner/duo/duo-tab";

export default function SummonerDuoPage() {
	return (
		<Suspense>
			<DuoTab />
		</Suspense>
	);
}
