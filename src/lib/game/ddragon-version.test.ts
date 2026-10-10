import { describe, expect, it } from "vitest";
import { FALLBACK_DDRAGON_VERSION, resolveDDragonVersion } from "./ddragon-version";

const memory = (initial: Record<string, string> = {}) => {
	const data = { ...initial };
	return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

describe("resolveDDragonVersion", () => {
	it("returns and remembers the latest version", async () => {
		const storage = memory();
		expect(await resolveDDragonVersion(async () => "16.21.1", storage)).toBe("16.21.1");
		expect(storage.data["ddragon-version"]).toBe("16.21.1");
	});

	it("falls back to the remembered version when the request fails", async () => {
		const failing = async () => Promise.reject(new Error("down"));
		expect(await resolveDDragonVersion(failing, memory({ "ddragon-version": "16.19.1" }))).toBe("16.19.1");
	});

	it("falls back to the build-time version without storage", async () => {
		const failing = async () => Promise.reject(new Error("down"));
		expect(await resolveDDragonVersion(failing, null)).toBe(FALLBACK_DDRAGON_VERSION);
	});

	it("survives storage that throws", async () => {
		const broken = {
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("denied");
			},
		};
		expect(await resolveDDragonVersion(async () => "16.21.1", broken)).toBe("16.21.1");
		expect(await resolveDDragonVersion(async () => Promise.reject(new Error("down")), broken)).toBe(FALLBACK_DDRAGON_VERSION);
	});
});
