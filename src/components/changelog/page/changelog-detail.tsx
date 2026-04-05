"use client";

import { type ChangelogEntry } from "../changelog-type";
import {
	CategoryBadge,
	CategoryCountBadge,
	getCategoryDotColor,
	type CategoryType,
} from "@/components/layout/badges";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChangelogTable } from "./changelog-table";

interface ChangelogDetailProps {
	entry: ChangelogEntry;
}

const CATEGORY_ORDER: CategoryType[] = [
	"feature",
	"improvement",
	"design",
	"fix",
];

const CATEGORY_LABELS: Record<string, string> = {
	feature: "Features",
	improvement: "Improvements",
	design: "Design",
	fix: "Fixes",
};

export default function ChangelogDetail({ entry }: ChangelogDetailProps) {
	const categoryCounts = entry.changes.reduce(
		(acc, c) => {
			acc[c.category] = (acc[c.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	// Group changes by category
	const grouped = CATEGORY_ORDER.filter(
		(cat) => categoryCounts[cat],
	).map((cat) => ({
		category: cat,
		items: entry.changes.filter((c) => c.category === cat),
	}));

	let globalIndex = 0;

	return (
		<div className="mx-auto max-w-3xl">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="mb-10"
			>
				<p className="text-base text-muted-foreground">
					{new Date(entry.date).toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</p>
				<h1 className="mt-2 text-4xl font-bold tracking-tight">
					{entry.title}
				</h1>
				<p className="mt-4 text-lg text-muted-foreground leading-relaxed">
					{entry.summary}
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					{Object.entries(categoryCounts).map(([cat, count]) => (
						<button
							key={cat}
							onClick={() => {
								document.getElementById(`category-${cat}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
							}}
						>
							<CategoryCountBadge
								category={cat as CategoryType}
								count={count}
							/>
						</button>
					))}
				</div>
			</motion.div>

			{/* Grouped by category */}
			{grouped.map((group, gi) => (
				<motion.div
					key={group.category}
					id={`category-${group.category}`}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.4, delay: 0.1 + gi * 0.08 }}
					className="mb-8 scroll-mt-20"
				>
					{/* Category heading */}
					<div className="flex items-center gap-2 mb-4">
						<CategoryBadge category={group.category} />
						<h2 className="text-lg font-bold">
							{CATEGORY_LABELS[group.category]}
						</h2>
						<span className="text-sm text-muted-foreground">
							({group.items.length})
						</span>
					</div>

					{/* Items */}
					<div className="border-l-2 border-border/30 pl-7 ml-2">
						<Accordion
							type="multiple"
							defaultValue={gi === 0 ? ["item-0"] : []}
							className="border-none"
						>
							{group.items.map((change, i) => {
								const idx = globalIndex++;
								return (
									<div key={idx} className="relative mb-1">
										<div
											className={`absolute -left-[37px] top-4 size-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold text-background ${getCategoryDotColor(change.category as CategoryType)}`}
										>
											{idx + 1}
										</div>

										<AccordionItem
											value={`item-${i}`}
											className="border-none rounded-xl bg-card/50 px-4 mb-2 [&:not(:last-child)]:border-b-0"
										>
											<AccordionTrigger className="py-3 hover:no-underline">
												<span className="text-base font-bold text-left">
													{change.title}
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<p className="text-base text-muted-foreground leading-relaxed pb-2">
													{change.description}
												</p>
												{change.table && (
													<ChangelogTable rows={change.table} />
												)}
												{change.img && (
													<div className="mt-3 overflow-hidden rounded-xl border border-border/30">
														<Image
															src={change.img}
															alt={change.title}
															width={800}
															height={450}
															className="w-full"
														/>
													</div>
												)}
											</AccordionContent>
										</AccordionItem>
									</div>
								);
							})}
						</Accordion>
					</div>
				</motion.div>
			))}
		</div>
	);
}
