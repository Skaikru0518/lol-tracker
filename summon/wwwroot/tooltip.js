// Opens the Tooltip component's popover on hover and places it next to its trigger, inside the viewport.
// Delegated from document, so it covers markup that enhanced navigation and interactive renders add later.
(() => {
    const delay = 200, gap = 8, edge = 8;
    let open = null, timer = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

    function place(trigger, tip) {
        const t = trigger.getBoundingClientRect();
        const r = tip.getBoundingClientRect();
        const width = document.documentElement.clientWidth, height = innerHeight;
        let side = trigger.dataset.tip === "right" && t.right + gap + r.width + edge <= width ? "right" : "top";
        if (side === "top" && t.top - gap - r.height < edge) side = "bottom";

        let x = side === "right" ? t.right + gap : t.left + t.width / 2 - r.width / 2;
        let y = side === "right" ? t.top + t.height / 2 - r.height / 2 : side === "top" ? t.top - gap - r.height : t.bottom + gap;
        x = clamp(x, edge, width - r.width - edge);
        y = clamp(y, edge, height - r.height - edge);

        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
        tip.dataset.side = side;
        // The arrow keeps pointing at the trigger's centre after clamping moved the body
        const arrow = side === "right" ? t.top + t.height / 2 - y : t.left + t.width / 2 - x;
        tip.style.setProperty("--tip-arrow", `${clamp(arrow, 10, (side === "right" ? r.height : r.width) - 10)}px`);
    }

    function hide() {
        clearTimeout(timer);
        if (open?.tip.isConnected && open.tip.matches(":popover-open")) open.tip.hidePopover();
        open = null;
    }

    document.addEventListener("pointerover", e => {
        const trigger = e.target.closest?.("[data-tip]");
        if (!trigger || trigger === open?.trigger) return;
        const tip = trigger.querySelector(":scope > [popover]");
        if (!tip) return;
        hide();
        open = { trigger, tip };
        timer = setTimeout(() => {
            if (!trigger.isConnected) return;
            tip.showPopover();
            place(trigger, tip);
        }, delay);
    });

    // Touch has no hover: a tap opens the tooltip and it stays until the next tap elsewhere, like :hover did
    document.addEventListener("pointerout", e => {
        if (open && e.pointerType !== "touch" && !open.trigger.contains(e.relatedTarget)) hide();
    });
    document.addEventListener("pointerdown", e => {
        if (open && !open.trigger.contains(e.target)) hide();
    });
    addEventListener("scroll", hide, { capture: true, passive: true });
    addEventListener("resize", hide);
})();
