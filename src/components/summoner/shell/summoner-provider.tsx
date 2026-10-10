"use client";

import { createContext, useContext } from "react";

/** Identity of the profile being viewed, shared by every tab. */
export interface SummonerContextValue {
	puuid: string;
	gameName: string;
	tagLine: string;
	basePath: string;
	version: string;
}

const SummonerContext = createContext<SummonerContextValue | null>(null);

export function SummonerProvider({
	value,
	children,
}: {
	value: SummonerContextValue;
	children: React.ReactNode;
}) {
	return <SummonerContext.Provider value={value}>{children}</SummonerContext.Provider>;
}

/** Profile identity for client tabs; throws outside the summoner layout. */
export function useSummonerContext(): SummonerContextValue {
	const value = useContext(SummonerContext);
	if (!value) throw new Error("useSummonerContext must be used inside SummonerProvider");
	return value;
}
