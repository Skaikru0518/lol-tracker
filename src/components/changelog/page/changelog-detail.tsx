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

interface ChangelogDetailProps {
	entry: ChangelogEntry;
}

export default function ChangelogDetail({ entry }: ChangelogDetailProps) {
	const categoryCounts = entry.changes.reduce(
		(acc, c) => {
			acc[c.category] = (acc[c.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

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
						<CategoryCountBadge
							key={cat}
							category={cat as CategoryType}
							count={count}
						/>
					))}
				</div>
			</motion.div>

			{/* Numbered timeline with accordion */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.4, delay: 0.15 }}
				className="border-l-2 border-border/30 pl-7 ml-2"
			>
				<Accordion type="multiple" defaultValue={["item-0"]} className="border-none">
					{entry.changes.map((change, i) => (
						<div key={i} className="relative mb-1">
							{/* Numbered dot */}
							<div
								className={`absolute -left-[37px] top-4 size-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold text-background ${getCategoryDotColor(change.category as CategoryType)}`}
							>
								{i + 1}
							</div>

							<AccordionItem
								value={`item-${i}`}
								className="border-none rounded-xl bg-card/50 px-4 mb-2 [&:not(:last-child)]:border-b-0"
							>
								<AccordionTrigger className="py-3 hover:no-underline">
									<div className="flex items-center gap-2.5 text-left">
										<CategoryBadge
											category={
												change.category as CategoryType
											}
										/>
										<span className="text-base font-bold">
											{change.title}
										</span>
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<p className="text-base text-muted-foreground leading-relaxed pb-2">
										{change.description}
									</p>
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
					))}
				</Accordion>
			</motion.div>
		</div>
	);
}
