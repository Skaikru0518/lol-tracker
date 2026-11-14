// The navbar search overlay's keys: "/" opens it outside text fields, Escape closes it; the open overlay stops the page scrolling.
window.summonSpotlight = (() => {
    const typingTags = new Set(["INPUT", "TEXTAREA", "SELECT"]);
    let navbar = null;

    document.addEventListener("keydown", event => {
        if (!navbar) return;
        if (event.key === "Escape") return void navbar.invokeMethodAsync("Close");
        const target = event.target;
        const typing = target && (target.isContentEditable || typingTags.has((target.tagName ?? "").toUpperCase()));
        if (event.key === "/" && !typing) {
            event.preventDefault();
            navbar.invokeMethodAsync("OpenFromKey");
        }
    });

    return {
        listen: dotnet => (navbar = dotnet),
        lockScroll: locked => (document.body.style.overflow = locked ? "hidden" : ""),
        show: el => el.showPopover(),
    };
})();
