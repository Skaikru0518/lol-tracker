"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { lpChangeLabel } from "@/lib/widget/format";
import styles from "./widget.module.css";

const ROLL_MS = 700;
const ROTATE_MS = 8000;

// Server components render these too, so the format is a key rather than a function
const FORMATS = {
	plain: (n: number) => String(n),
	rate: (n: number) => `(${n}%)`,
	signed: lpChangeLabel,
};
export type NumberFormat = keyof typeof FORMATS;

/** A number that rolls to each new value; with `animate` it also counts up from zero on mount. */
export function RollingNumber({ value, animate, format = "plain", suffix = "" }: { value: number; animate: boolean; format?: NumberFormat; suffix?: string }) {
	const [shown, setShown] = useState(animate ? 0 : value);
	const [bumps, setBumps] = useState(0);
	const from = useRef(animate ? 0 : value);

	useEffect(() => {
		const start = from.current;
		from.current = value;
		// Frames stop in hidden pages (a hidden OBS source, a background tab); the timeout lands the final value anyway
		const settle = setTimeout(() => setShown(value), animate && start !== value ? ROLL_MS + 100 : 0);
		if (!animate || start === value) return () => clearTimeout(settle);
		const mounting = start === 0;
		const t0 = performance.now();
		let frame = requestAnimationFrame(function step(t) {
			const k = Math.min(1, (t - t0) / ROLL_MS);
			setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))));
			if (k < 1) frame = requestAnimationFrame(step);
			else if (!mounting) setBumps((n) => n + 1);
		});
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(settle);
		};
	}, [value, animate]);

	return (
		<span key={bumps} className={cn(styles.num, bumps > 0 && styles.bump)}>
			{FORMATS[format](shown)}
			{suffix}
		</span>
	);
}

/** Alternates its two children every few seconds. */
export function Rotator({ children }: { children: [React.ReactNode, React.ReactNode] }) {
	const [flip, setFlip] = useState(false);
	useEffect(() => {
		const timer = setInterval(() => setFlip((f) => !f), ROTATE_MS);
		return () => clearInterval(timer);
	}, []);
	return <div className={cn(styles.rot, flip && styles.flip)}>{children}</div>;
}

/** Game time since `startedAt`, ticking every second. */
export function LiveClock({ startedAt }: { startedAt: number | null }) {
	const [now, setNow] = useState<number | null>(null);
	useEffect(() => {
		const tick = () => setNow(Date.now());
		const first = requestAnimationFrame(tick);
		const timer = setInterval(tick, 1000);
		return () => {
			cancelAnimationFrame(first);
			clearInterval(timer);
		};
	}, []);
	if (!startedAt || now === null) return <span>Live</span>;
	const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
	return (
		<span>
			Live {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
		</span>
	);
}

const MARQUEE_SPEED = 30;
const MARQUEE_PAUSE_S = 2;

/** Long names scroll back and forth instead of being cut off. */
export function MarqueeText({ children, animate }: { children: React.ReactNode; animate: boolean }) {
	const outer = useRef<HTMLSpanElement>(null);
	const inner = useRef<HTMLSpanElement>(null);
	const [shift, setShift] = useState(0);

	useEffect(() => {
		if (!animate || !outer.current || !inner.current) return;
		const box = outer.current;
		const text = inner.current;
		const measure = () => setShift(Math.max(0, Math.ceil(text.getBoundingClientRect().width - box.clientWidth)));
		// The observer only fires on rendered frames; the timeout measures a page that starts hidden
		const first = setTimeout(measure, 0);
		const observer = new ResizeObserver(measure);
		observer.observe(box);
		observer.observe(text);
		return () => {
			clearTimeout(first);
			observer.disconnect();
		};
	}, [animate]);

	const moving = animate && shift > 0;
	return (
		<span ref={outer}>
			<span
				ref={inner}
				className={cn(styles.marquee, moving && styles.marqueeMoving)}
				style={moving ? ({ "--shift": `-${shift}px`, "--dur": `${shift / MARQUEE_SPEED + MARQUEE_PAUSE_S}s` } as React.CSSProperties) : undefined}
			>
				{children}
			</span>
		</span>
	);
}
