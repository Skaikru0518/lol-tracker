export default function Footer() {
	return (
		<footer className="fixed bottom-0 left-0 right-0 z-40 border-t py-1.5 backdrop-blur-md bg-background/80">
			<div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
				<span className="font-medium">Summon.gg</span>
				<span>·</span>
				<span>Built with Next.js</span>
				<span>·</span>
				<span>Not endorsed by Riot Games</span>
			</div>
		</footer>
	);
}
