/** Date shown under the policy title. */
export const POLICY_UPDATED = "October 10, 2026";

/** Policy text by section, in reading order; ids are the anchors the table of contents links to. */
export const POLICY_SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
	{
		id: "what-is-summon-gg",
		title: "What is Summon.gg?",
		body: (
			<>
				<p>
					Summon.gg is a free-to-use League of Legends stat tracker.
					We&apos;re not a company and we don&apos;t sell anything.
					There may be occasional downtime, slower response times during peak usage,
					or service interruptions. We do our best to keep things running smoothly,
					but we can&apos;t guarantee 100% uptime. Use the site as-is, with no warranties.
					As the site grows, we plan to migrate to a custom domain and more stable hosting.
				</p>
			</>
		),
	},
	{
		id: "what-data-do-we-collect",
		title: "What data do we collect?",
		body: (
			<>
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
			</>
		),
	},
	{
		id: "how-do-we-store-it",
		title: "How do we store it?",
		body: (
			<>
				<p>
					We cache Riot API responses in a PostgreSQL database to make the site faster.
					This means if you search for a summoner, their data gets saved so the next visit loads instantly
					instead of waiting for the Riot API. Match data is stored permanently (finished matches never change),
					while other data (ranked, summoner info) is refreshed periodically.
				</p>
			</>
		),
	},
	{
		id: "what-we-dont-collect",
		title: "What we DON'T collect",
		body: (
			<>
				<ul className="list-disc pl-6 space-y-2">
					<li>No personal information (email, password, real name, IP address)</li>
					<li>No cookies for tracking</li>
					<li>No third-party trackers — we only use basic, anonymous page view analytics</li>
					<li>No login or account system</li>
					<li>No payment information</li>
				</ul>
				<p className="mt-3">
					We literally just read publicly available League of Legends data. That&apos;s it.
				</p>
			</>
		),
	},
	{
		id: "local-storage",
		title: "Local storage",
		body: (
			<>
				<p>
					We use your browser&apos;s localStorage to save your recent search history
					(last 10 summoner names you searched). This stays on your device and is never sent to our servers.
					You can clear it at any time.
				</p>
				<p>
					While you type in the search box, the text is sent to our server to suggest summoners we already have
					stored. It is only used to answer that request and is not saved.
				</p>
			</>
		),
	},
	{
		id: "riot-games",
		title: "Riot Games",
		body: (
			<>
				<p>
					Summon.gg isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions
					of Riot Games or anyone officially involved in producing or managing Riot Games properties.
					Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
				</p>
			</>
		),
	},
	{
		id: "questions",
		title: "Questions?",
		body: (
			<>
				<p>
					If you have any questions about this policy or want your data removed,
					reach out on{" "}
					<a
						href="https://github.com/Skaikru0518"
						target="_blank"
						rel="noopener noreferrer"
						className="font-semibold text-primary hover:underline"
					>
						GitHub — Skaikru0518
					</a>
					. Happy to help.
				</p>
			</>
		),
	},
];
