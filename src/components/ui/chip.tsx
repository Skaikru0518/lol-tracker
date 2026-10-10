import { cn } from "@/lib/utils";
import { chipStyle } from "@/lib/ui/chip-style";

/** Small colored label from a hex color; invalid colors render muted. */
export function Chip({
	color,
	className,
	style,
	...props
}: Omit<React.ComponentProps<"span">, "color"> & { color: string }) {
	return (
		<span
			data-slot="chip"
			className={cn(
				"inline-flex h-5 items-center gap-1 whitespace-nowrap rounded border px-1.5 text-3xs font-semibold",
				className,
			)}
			style={{ ...chipStyle(color), ...style }}
			{...props}
		/>
	);
}
