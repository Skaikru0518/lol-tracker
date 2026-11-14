// Search history change notices, like the original's useSyncExternalStore: other tabs fire "storage", this tab fires the change event.
window.summonHistory = (() => {
    const key = "summon-gg-search-history";
    const changeEvent = "summon-gg-search-history-change";

    return {
        // Tells the chips to read the history again whenever it changes, here or in another tab; returns a stop function
        listen: dotnet => {
            const notify = () => dotnet.invokeMethodAsync("HistoryChanged");
            const onStorage = event => { if (event.key === null || event.key === key) notify(); };
            window.addEventListener("storage", onStorage);
            window.addEventListener(changeEvent, notify);
            return { stop: () => { window.removeEventListener("storage", onStorage); window.removeEventListener(changeEvent, notify); } };
        },
        changed: () => window.dispatchEvent(new Event(changeEvent)),
    };
})();
