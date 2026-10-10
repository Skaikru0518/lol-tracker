const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Whether a key event target is a text field (global shortcuts should skip it). */
export function isTypingTarget(
	target: { tagName?: string; isContentEditable?: boolean } | null,
): boolean {
	if (!target) return false;
	if (target.isContentEditable) return true;
	return TYPING_TAGS.has((target.tagName ?? "").toUpperCase());
}
