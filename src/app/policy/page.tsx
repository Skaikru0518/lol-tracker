import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { POLICY_SECTIONS, POLICY_UPDATED } from "@/components/policy/policy-sections";
import { PolicyToc } from "@/components/policy/policy-toc";

/** Privacy and data policy: sticky table of contents with readable-width text panels. */
export default function PolicyPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10">
			<h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy &amp; Data Policy</h1>
			<p className="mt-1 text-muted-foreground">Last updated: {POLICY_UPDATED}</p>
			<div className="mt-8 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
				<aside>
					<PolicyToc sections={POLICY_SECTIONS} />
				</aside>
				<div className="space-y-4">
					{POLICY_SECTIONS.map((s) => (
						<Panel key={s.id} id={s.id} className="scroll-mt-20">
							<PanelHeader title={s.title} />
							<PanelBody className="max-w-prose space-y-3 text-sm leading-relaxed text-foreground/90 [&_ul]:space-y-1.5">{s.body}</PanelBody>
						</Panel>
					))}
				</div>
			</div>
		</div>
	);
}
