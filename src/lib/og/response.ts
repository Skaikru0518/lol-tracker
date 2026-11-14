import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

type OgKind = "complete" | "incomplete" | "missing";

const CACHE: Record<OgKind, string> = {
	complete: "public, max-age=31536000, immutable",
	incomplete: "public, max-age=3600",
	missing: "public, max-age=300",
};

export function ogCacheControl(kind: OgKind): string {
	return CACHE[kind];
}

// Geist Regular ships with next/og; the bold weight is ours (traced into the build by next.config)
let bold: Promise<Buffer> | null = null;

export async function ogImage(element: React.ReactElement, complete: boolean): Promise<ImageResponse> {
	bold ??= readFile(join(process.cwd(), "assets/fonts/Geist-Bold.ttf"));
	return new ImageResponse(element, {
		...OG_SIZE,
		fonts: [{ name: "Geist", data: await bold, weight: 700, style: "normal" }],
		headers: { "Cache-Control": ogCacheControl(complete ? "complete" : "incomplete") },
	});
}

export function ogNotFound(): Response {
	return new Response("Not found", { status: 404, headers: { "Cache-Control": ogCacheControl("missing") } });
}

/** A file from `public/` as a data URL, for images the renderer cannot fetch by relative path. */
export async function publicDataUrl(path: string, mime: string): Promise<string> {
	return `data:${mime};base64,${(await readFile(join(process.cwd(), "public", path))).toString("base64")}`;
}
