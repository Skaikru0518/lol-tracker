// Transparent and chrome-free: OBS shows everything this page renders on stream
export default function WidgetLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<>
			<style>{"html, body { background: transparent !important; overflow: hidden; }"}</style>
			{children}
		</>
	);
}
