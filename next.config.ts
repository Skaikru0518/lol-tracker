import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
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
