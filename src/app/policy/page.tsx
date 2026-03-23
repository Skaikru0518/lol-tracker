import BackButton from "@/components/ui/back-button";

export default function PolicyPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
			<BackButton />
			<div className="mb-10">
				<h1 className="text-4xl font-bold tracking-tight">Privacy & Data Policy</h1>
				<p className="mt-2 text-lg text-muted-foreground">
					Last updated: March 24, 2026
				</p>
			</div>

			<div className="space-y-8 text-base text-foreground/90 leading-relaxed">
				<section>
					<h2 className="text-2xl font-bold mb-3">What is Summon.gg?</h2>
					<p>
						Summon.gg is an open-source, community-driven League of Legends stat tracker.
						It&apos;s a practice project built for fun — we&apos;re not a company, we don&apos;t sell anything,
						and we&apos;re not trying to be the next op.gg. Just a couple of friends who like League and coding.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">What data do we collect?</h2>
					<p className="mb-3">
						All data displayed on Summon.gg comes directly from the{" "}
						<span className="font-semibold">Riot Games API</span>. This is publicly available data
						that Riot makes accessible to any registered developer. We collect and cache:
					</p>
					<ul className="list-disc pl-6 space-y-2">
						<li><span className="font-medium">Account info</span> — Riot ID (game name + tag), PUUID</li>
						<li><span className="font-medium">Summoner data</span> — profile icon, summoner level</li>
						<li><span className="font-medium">Ranked stats</span> — tier, rank, LP, wins, losses</li>
						<li><span className="font-medium">Match history</span> — match details, participants, timeline data</li>
						<li><span className="font-medium">Champion mastery</span> — mastery level and points per champion</li>
						<li><span className="font-medium">Live game</span> — current game info (if in a game)</li>
						<li><span className="font-medium">LP history</span> — snapshots of ranked LP over time (tracked automatically)</li>
					</ul>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">How do we store it?</h2>
					<p>
						We cache Riot API responses in a PostgreSQL database to make the site faster.
						This means if you search for a summoner, their data gets saved so the next visit loads instantly
						instead of waiting for the Riot API. Match data is stored permanently (finished matches never change),
						while other data (ranked, summoner info) is refreshed periodically.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">What we DON&apos;T collect</h2>
					<ul className="list-disc pl-6 space-y-2">
						<li>No personal information (email, password, real name, IP address)</li>
						<li>No cookies for tracking</li>
						<li>No analytics or third-party trackers</li>
						<li>No login or account system</li>
						<li>No payment information</li>
					</ul>
					<p className="mt-3">
						We literally just read publicly available League of Legends data. That&apos;s it.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">Local storage</h2>
					<p>
						We use your browser&apos;s localStorage to save your recent search history
						(last 5 summoner names you searched). This stays on your device and is never sent to our servers.
						You can clear it at any time.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">Riot Games</h2>
					<p>
						Summon.gg isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions
						of Riot Games or anyone officially involved in producing or managing Riot Games properties.
						Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">Questions?</h2>
					<p>
						If you have any questions about this policy or want your data removed,
						reach out to us on GitHub. We&apos;re happy to help.
					</p>
				</section>
			</div>
		</div>
	);
}
