// Back/Forward between profile tabs: the tabs only push the address, so the profile is told which path is showing now
window.summonProfileNav = {
    // Returns a stop function
    listen: dotnet => {
        const onPop = () => dotnet.invokeMethodAsync("AddressChanged", location.pathname);
        window.addEventListener("popstate", onPop);
        return { stop: () => window.removeEventListener("popstate", onPop) };
    },
};
