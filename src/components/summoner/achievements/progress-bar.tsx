/** Thin progress bar in a given color. */
export function ProgressBar({ percent, color }: { percent: number; color: string }) {
	return (
		<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
		</div>
	);
}
