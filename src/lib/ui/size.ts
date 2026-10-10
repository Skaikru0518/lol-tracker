/** A pixel size designed at the 16px root, as rem, so icons scale with the fluid root font size. */
export function remSize(px: number): string {
	return `${px / 16}rem`;
}
