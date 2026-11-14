// Toasts like the original's react-hot-toast: top center, a green check or red cross, success for 2 s and errors for 4 s,
// styled with the site's card colors as the original's <Toaster> options set them.
window.summonToast = (() => {
    const durations = { success: 2000, error: 4000 };
    const colors = { success: "#61d345", error: "#ff4b4b" };
    let box = null;

    function container() {
        if (box?.isConnected) return box;
        box = document.createElement("div");
        box.setAttribute("aria-live", "polite");
        box.style.cssText = "position:fixed;z-index:9999;top:16px;left:16px;right:16px;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none";
        document.body.appendChild(box);
        return box;
    }

    function icon(type) {
        const mark = type === "success"
            ? '<path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            : '<path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
        return `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style="flex-shrink:0"><circle cx="10" cy="10" r="10" fill="${colors[type]}"/>${mark}</svg>`;
    }

    function show(type, message) {
        const toast = document.createElement("div");
        toast.setAttribute("role", "status");
        toast.style.cssText =
            "display:flex;align-items:center;max-width:350px;padding:8px 10px;border-radius:8px;line-height:1.3;font-size:14px;" +
            "background:var(--color-card);color:var(--color-card-foreground);border:1px solid var(--color-border);" +
            "box-shadow:0 3px 10px rgba(0,0,0,.1),0 3px 3px rgba(0,0,0,.05);pointer-events:auto;" +
            "transition:opacity .35s,transform .35s cubic-bezier(.21,1.02,.73,1);opacity:0;transform:translateY(-200%) scale(.6)";
        toast.innerHTML = `${icon(type)}<div style="margin:4px 10px;flex:1 1 auto;white-space:pre-line"></div>`;
        toast.lastChild.textContent = message;
        container().appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "none";
        });
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-150%) scale(.6)";
            setTimeout(() => toast.remove(), 400);
        }, durations[type]);
    }

    return { success: message => show("success", message), error: message => show("error", message) };
})();
