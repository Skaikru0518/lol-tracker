// Stream widget motion the original ran in React: rolling numbers, the Rotator and the live game clock.
// The components render these elements empty with data attributes; this script fills and moves them, so a
// server render never sends a frame per animation step.
(() => {
    const rollMs = 700, rotateMs = 8000;
    const formats = {
        plain: n => String(n),
        rate: n => `(${n}%)`,
        signed: n => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0"),
    };
    // The value each number last settled on; a new data-roll rolls from it
    const settled = new WeakMap();

    function write(el, n) {
        el.textContent = (formats[el.dataset.format] ?? formats.plain)(n) + (el.dataset.suffix ?? "");
    }

    function bump(el) {
        el.classList.remove("wg-bump");
        void el.offsetWidth;
        el.classList.add("wg-bump");
    }

    // RollingNumber: rolls to each new value; with data-animate it also counts up from zero when it appears
    function roll(el) {
        const value = Number(el.dataset.roll);
        const animate = el.dataset.animate === "1";
        const start = settled.has(el) ? settled.get(el) : animate ? 0 : value;
        settled.set(el, value);
        clearTimeout(el.wgSettle);
        cancelAnimationFrame(el.wgFrame);
        if (!animate || start === value) return write(el, value);
        const mounting = start === 0;
        // Frames stop in hidden pages (a hidden OBS source, a background tab); the timeout lands the final value anyway
        el.wgSettle = setTimeout(() => write(el, value), rollMs + 100);
        const t0 = performance.now();
        const step = t => {
            const k = Math.min(1, (t - t0) / rollMs);
            write(el, Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))));
            if (k < 1) el.wgFrame = requestAnimationFrame(step);
            else if (!mounting) bump(el);
        };
        el.wgFrame = requestAnimationFrame(step);
    }

    function clock(el) {
        const started = Number(el.dataset.liveStart);
        if (!started) return (el.textContent = "Live");
        const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
        el.textContent = `Live ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }

    function scan(root) {
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        const find = selector => (root.matches(selector) ? [root] : []).concat([...root.querySelectorAll(selector)]);
        find("[data-roll]").forEach(roll);
        find("[data-live-start]").forEach(clock);
    }

    new MutationObserver(records => {
        for (const record of records) {
            if (record.type === "attributes") {
                if (record.attributeName === "data-roll") roll(record.target);
                else clock(record.target);
            } else record.addedNodes.forEach(scan);
        }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-roll", "data-live-start"] });

    // Rotator: alternates its two children every few seconds
    setInterval(() => document.querySelectorAll("[data-rotate]").forEach(el => el.classList.toggle("wg-flip")), rotateMs);
    // LiveClock: game time ticking every second
    setInterval(() => document.querySelectorAll("[data-live-start]").forEach(clock), 1000);

    scan(document.documentElement);

    // "Today" sessions count from the viewer's own midnight, which only the browser knows; the generator dialog opens in the top layer
    window.summonWidget = { midnight: () => new Date().setHours(0, 0, 0, 0), showLayer: el => el.showPopover() };
})();
