using System.Net.Http.Json;

namespace summon.Riot;

public class RiotClient(HttpClient http)
{
    public Task<RiotAccount?> GetAccountByRiotIdAsync(string gameName, string tagLine, CancellationToken ct = default) => http.GetFromJsonAsync<RiotAccount>($"riot/account/v1/accounts/by-riot-id/{Uri.EscapeDataString(gameName)}/{Uri.EscapeDataString(tagLine)}", ct);
}