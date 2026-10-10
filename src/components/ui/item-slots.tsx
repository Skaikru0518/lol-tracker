import { cn } from "@/lib/utils";
import { getItemIcon } from "@/lib/icon-helpers";

/** Row of item icons; `0` renders as an empty slot. */
export function ItemSlots({
	version,
	items,
	size = 22,
	className,
}: {
	version: string;
	items: readonly number[];
	size?: number;
	className?: string;
}) {
	return (
		<div className={cn("flex gap-0.5", className)}>
			{items.map((itemId, index) => {
				const src = getItemIcon(version, itemId);
				return src ? (
					<img
						key={index}
						src={src}
						alt=""
						width={size}
						height={size}
						className="rounded"
					/>
				) : (
					<span
						key={index}
						className="rounded bg-muted"
						style={{ width: size, height: size }}
					/>
				);
			})}
		</div>
	);
}
