/** Section links; sticky beside the text from `lg`, a plain list above it on small screens. */
export function PolicyToc({ sections }: { sections: { id: string; title: string }[] }) {
	return (
		<nav aria-label="Policy sections" className="lg:sticky lg:top-20">
			<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
			<ul className="space-y-1.5 text-sm">
				{sections.map((s) => (
					<li key={s.id}>
						<a href={`#${s.id}`} className="text-muted-foreground transition-colors hover:text-primary">
							{s.title}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
