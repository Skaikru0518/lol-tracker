import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = "https://summon-gg.vercel.app";

	// Static pages
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 1,
		},
		{
			url: `${baseUrl}/changelog`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.5,
		},
		{
			url: `${baseUrl}/policy`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.3,
		},
	];

	// Dynamic summoner pages from tracked accounts
	const accounts = await prisma.account.findMany({
		where: { gameName: { not: "" } },
		select: { gameName: true, tagLine: true, updatedAt: true },
	});

	const summonerPages: MetadataRoute.Sitemap = accounts.map((account) => ({
		url: `${baseUrl}/summoner/${account.gameName}-${account.tagLine}`,
		lastModified: account.updatedAt,
		changeFrequency: "daily" as const,
		priority: 0.8,
	}));

	return [...staticPages, ...summonerPages];
}
