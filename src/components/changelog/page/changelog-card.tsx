"use client";

import { type ChangelogEntry } from "../changelog-type";
import { CategoryBadge, type CategoryType } from "@/components/layout/badges";
import { motion } from "framer-motion";
import Link from "next/link";

interface ChangelogCardProps {
	entry: ChangelogEntry;
	index: number;
	isLast?: boolean;
}

export default function ChangelogCard({ entry, index, isLast }: ChangelogCardProps) {
	const categories = [...new Set(entry.changes.map((c) => c.category))] as CategoryType[];

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: index * 0.08 }}
			className="relative pl-8"
		>
			{/* Timeline dot */}
			<div
				className={`absolute left-0 top-1.5 size-3.5 rounded-full border-2 border-background ${
					index === 0 ? "bg-primary" : "bg-cyan-500"
				}`}
			/>

			{/* Timeline line */}
			{!isLast && (
				<div className="absolute left-[6px] top-5 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 to-cyan-500/10" />
			)}

			{/* Date */}
			<p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
				{new Date(entry.date).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})}
			</p>

			{/* Card */}
			<Link href={`/changelog/${entry.slug}`}>
				<div className="rounded-xl border bg-card p-5 mb-8 cursor-pointer transition-all hover:bg-accent/20 hover:border-primary/20 group">
					<h2 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
						{entry.title}
					</h2>
					<p className="mt-2 text-base text-muted-foreground line-clamp-2 leading-relaxed">
						{entry.summary}
					</p>
					<div className="mt-3 flex flex-wrap items-center gap-1.5">
						{categories.map((cat) => (
							<CategoryBadge key={cat} category={cat} />
						))}
						<span className="text-sm text-muted-foreground ml-1">
							· {entry.changes.length} changes
						</span>
					</div>
				</div>
			</Link>
		</motion.div>
	);
}
