// MarqueeText: text wider than its box gets marquee-moving with the shift and duration the CSS animation uses.
// Watches the document, so it covers markup that enhanced navigation and interactive renders add later.
(() => {
    const speed = 30, pause = 2;

    function measure(box) {
        const text = box?.firstElementChild;
        if (!text) return;
        // Exact widths: clientWidth rounds down, so a name that just fits would wiggle by a pixel
        const shift = Math.max(0, Math.ceil(text.getBoundingClientRect().width - box.getBoundingClientRect().width));
        text.classList.toggle("marquee-moving", shift > 0);
        text.style.setProperty("--shift", `-${shift}px`);
        text.style.setProperty("--dur", `${shift / speed + pause}s`);
    }

    const resize = new ResizeObserver(entries => {
        for (const entry of entries) measure(entry.target.closest("[data-marquee]"));
    });

    function watch(root) {
        const boxes = root.matches?.("[data-marquee]") ? [root] : root.querySelectorAll?.("[data-marquee]") ?? [];
        for (const box of boxes) {
            // Observing again is harmless, and catches a text span a render replaced
            resize.observe(box);
            if (box.firstElementChild) resize.observe(box.firstElementChild);
            // The observer only fires on rendered frames; the timeout measures a page that starts hidden
            setTimeout(() => measure(box), 0);
        }
    }

    new MutationObserver(records => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) watch(node.closest("[data-marquee]") ?? node);
                // New text inside a box changes its width; text anywhere else cannot hold one
                else if (node.parentElement?.closest("[data-marquee]") instanceof Element) watch(node.parentElement.closest("[data-marquee]"));
            }
        }
    }).observe(document.documentElement, { childList: true, subtree: true });

    watch(document);
})();
