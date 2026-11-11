using System.Net.Http.Json;

namespace summon.Riot;

public class RiotClient(HttpClient http)
{
    private const string Europe = "https://europe.api.riotgames.com";

    public Task<RiotAccount?> GetAccountByRiotIdAsync(string gameName, string tagLine, CancellationToken ct = default) =>
        http.GetFromJsonAsync<RiotAccount>($"{Europe}/riot/account/v1/accounts/by-riot-id/{Uri.EscapeDataString(gameName)}/{Uri.EscapeDataString(tagLine)}", ct);

    public Task<RiotActiveRegion?> GetActiveRegionAsync(string puuid, CancellationToken ct = default) => http.GetFromJsonAsync<RiotActiveRegion>($"{Europe}/riot/account/v1/region/by-game/lol/by-puuid/{Uri.EscapeDataString(puuid)}", ct);
}