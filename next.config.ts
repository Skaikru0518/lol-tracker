import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "ddragon.leagueoflegends.com" },
			{ protocol: "https", hostname: "raw.communitydragon.org" },
		],
	},
};

export default nextConfig;
