import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CategoryType = "feature" | "improvement" | "fix" | "design";

const CATEGORY_STYLES: Record<CategoryType, string> = {
	feature: "bg-cyan-500/8 text-cyan-400 border-cyan-500/25",
	improvement: "bg-green-500/8 text-green-400 border-green-500/25",
	fix: "bg-orange-500/8 text-orange-400 border-orange-500/25",
	design: "bg-fuchsia-500/8 text-fuchsia-400 border-fuchsia-500/25",
};

const CATEGORY_LABELS: Record<CategoryType, string> = {
	feature: "Feature",
	improvement: "Improvement",
	fix: "Fix",
	design: "Design",
};

const CATEGORY_DOT_COLORS: Record<CategoryType, string> = {
	feature: "bg-cyan-400",
	improvement: "bg-green-400",
	fix: "bg-orange-400",
	design: "bg-fuchsia-400",
};

interface CategoryBadgeProps {
	category: CategoryType;
	className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"rounded-full font-semibold border text-sm",
				CATEGORY_STYLES[category],
				className,
			)}
		>
			{CATEGORY_LABELS[category]}
		</Badge>
	);
}

interface CategoryCountBadgeProps {
	category: CategoryType;
	count: number;
	className?: string;
}

export function CategoryCountBadge({ category, count, className }: CategoryCountBadgeProps) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"rounded-full font-semibold border text-sm",
				CATEGORY_STYLES[category],
				className,
			)}
		>
			{count} {count === 1 ? CATEGORY_LABELS[category].toLowerCase() : `${CATEGORY_LABELS[category].toLowerCase()}s`}
		</Badge>
	);
}

export function getCategoryDotColor(category: CategoryType): string {
	return CATEGORY_DOT_COLORS[category] ?? "bg-muted-foreground";
}

export { CATEGORY_STYLES, CATEGORY_LABELS, CATEGORY_DOT_COLORS };
export type { CategoryType };
