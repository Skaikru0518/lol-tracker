import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	async redirects() {
		return [
			{
				// Pre-redesign champion pages; the tab segments are excluded
				source: "/summoner/:name/:champion((?!(?:champions|lp|achievements|live)(?:/|$))[^/]+)",
				destination: "/summoner/:name/champions/:champion",
				permanent: true,
			},
		];
	},
	logging: {
		fetches: {
			fullUrl: false,
		},
	},
	images: {
		unoptimized: true,
		remotePatterns: [
			{ protocol: "https", hostname: "ddragon.leagueoflegends.com" },
			{ protocol: "https", hostname: "raw.communitydragon.org" },
		],
	},
};

export default nextConfig;
